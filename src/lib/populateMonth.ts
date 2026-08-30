import { SAVINGS_BUCKETS, parseRecurrence, type Entry, type MonthMeta } from '@/lib/types';
import {
  asUuidOrNull,
  entryWritePayload,
  itemsQuery,
  monthKeyFromRow,
  monthWritePayload,
  monthsQuery,
  normalizeEntry as mapEntry,
  normalizeMeta,
  omitInvalidUuids,
} from '@/lib/financeDb';
import { readPaymentTypeMap, readRecurrenceMap, writePaymentType, writeRecurrence } from '@/lib/paidStorage';
import { isRolloverSourceEntry, latestPrecedingMonth, withMonthLock } from '@/lib/monthRollover';
import { logSupabaseError } from '@/lib/supabaseErrors';

const DEFAULT_ALLOC = {
  ending_balance: 0,
  carried_over_balance: 0,
  alloc_buffer: 40,
  alloc_avanza: 40,
  alloc_travel: 20,
};

export type PopulateResult = {
  skipped: boolean;
  inserted: Entry[];
  meta: MonthMeta | null;
};

function toEntry(row: Record<string, unknown>, userId: string): Entry {
  const mapped = mapEntry(row);
  const localType = readPaymentTypeMap(userId)[mapped.id];
  const recLocal = readRecurrenceMap(userId)[mapped.id];
  let next: Entry = { ...mapped, paid: false };
  if (localType === 'autogiro' || localType === 'card_pot' || localType === 'invoice') {
    next = { ...next, payment_type: localType };
  }
  if (recLocal?.recurrence) {
    next = {
      ...next,
      recurrence: parseRecurrence(recLocal.recurrence),
      recurrence_anchor: recLocal.recurrence_anchor,
    };
  }
  return next;
}

function copyPayload(
  uid: string,
  toMonth: string,
  source: Entry,
  monthlyRecordId: string | null,
  flags: { recordId: boolean; extras: boolean },
) {
  return entryWritePayload({
    userId: uid,
    month: toMonth,
    category: source.category,
    name: source.name,
    amount: source.amount,
    monthlyRecordId: flags.recordId ? monthlyRecordId : null,
    paid: false,
    payment_type: flags.extras ? source.payment_type : undefined,
    recurrence: flags.extras ? source.recurrence : undefined,
    recurrence_anchor: flags.extras ? source.recurrence_anchor : undefined,
  });
}

async function insertCopies(
  uid: string,
  toMonth: string,
  source: Entry[],
  monthlyRecordId: string | null,
): Promise<Record<string, unknown>[]> {
  const attempts = [
    { recordId: true, extras: true },
    { recordId: false, extras: true },
    { recordId: false, extras: false },
  ];
  let lastError: { message?: string } | null = null;
  for (const flags of attempts) {
    const payload = source.map((row) => copyPayload(uid, toMonth, row, monthlyRecordId, flags));
    const { data, error } = await itemsQuery().insert(payload).select();
    if (!error && data) return data as Record<string, unknown>[];
    lastError = error;
    if (error && !/monthly_record_id|payment_type|recurrence|paid|schema cache|column/i.test(error.message)) {
      break;
    }
  }
  console.error('[PGRST] public.budget_items.rollover', lastError?.message, lastError);
  logSupabaseError(lastError, 'public.budget_items.rollover');
  throw new Error(lastError?.message ?? 'Kunde inte kopiera budgeten till ny månad.');
}

async function applyCopyMetadata(
  uid: string,
  source: Entry[],
  rows: Record<string, unknown>[],
): Promise<Entry[]> {
  const mapped = rows.map((row, i) => {
    const base = toEntry(row, uid);
    const src = source[i];
    const rowId = asUuidOrNull(row.id);
    if (src && rowId) {
      if (src.payment_type && src.payment_type !== 'invoice') {
        writePaymentType(uid, rowId, src.payment_type);
      }
      if (src.recurrence && src.recurrence !== 'none') {
        writeRecurrence(uid, rowId, {
          recurrence: src.recurrence,
          recurrence_anchor: src.recurrence_anchor ?? src.month,
        });
      }
    }
    return src
      ? {
          ...base,
          paid: false,
          payment_type: src.payment_type,
          recurrence: src.recurrence,
          recurrence_anchor: src.recurrence_anchor,
        }
      : { ...base, paid: false };
  });

  await Promise.all(rows.map(async (row, i) => {
    const src = source[i];
    const rowId = asUuidOrNull(row.id);
    if (!src || !rowId) return;
    const patch: Record<string, unknown> = { paid: false };
    if (src.payment_type) patch.payment_type = src.payment_type;
    if (src.recurrence && src.recurrence !== 'none') {
      patch.recurrence = src.recurrence;
      patch.recurrence_anchor = src.recurrence_anchor ?? src.month;
    }
    const { error } = await itemsQuery()
      .update(omitInvalidUuids(patch))
      .eq('id', rowId)
      .eq('user_id', uid);
    if (error && !/payment_type|recurrence|paid|schema cache|column/i.test(error.message)) {
      console.error('[PGRST] public.budget_items.rollover.patch', error.message, error);
      logSupabaseError(error, 'public.budget_items.rollover.patch');
    }
  }));

  return mapped;
}

async function ensureMonthRow(uid: string, month: string): Promise<MonthMeta> {
  const existing = await monthsQuery().select('*').eq('user_id', uid).eq('month', month).maybeSingle();
  if (existing.data) return normalizeMeta(existing.data as Record<string, unknown>);
  const { data, error } = await monthsQuery()
    .insert(monthWritePayload({ userId: uid, month, ...DEFAULT_ALLOC }))
    .select()
    .maybeSingle();
  if (data) return normalizeMeta(data as Record<string, unknown>);
  const dup = await monthsQuery().select('*').eq('user_id', uid).eq('month', month).maybeSingle();
  if (dup.data) return normalizeMeta(dup.data as Record<string, unknown>);
  console.error('[PGRST] public.monthly_records.rollover', error?.message, error);
  logSupabaseError(error, 'public.monthly_records.rollover');
  throw new Error(error?.message ?? 'Kunde inte skapa månad.');
}

async function copyAllocFromPrevious(uid: string, fromMonth: string, dest: MonthMeta): Promise<MonthMeta> {
  const { data } = await monthsQuery().select('*').eq('user_id', uid).eq('month', fromMonth).maybeSingle();
  if (!data) return dest;
  const prev = normalizeMeta(data as Record<string, unknown>);
  const destId = asUuidOrNull(dest.id);
  if (!destId) return dest;
  const patch = {
    alloc_buffer: prev.alloc_buffer,
    alloc_avanza: prev.alloc_avanza,
    alloc_travel: prev.alloc_travel,
  };
  const { error } = await monthsQuery().update(omitInvalidUuids(patch)).eq('id', destId).eq('user_id', uid);
  if (error) {
    console.error('[PGRST] public.monthly_records.rollover.alloc', error.message, error);
    logSupabaseError(error, 'public.monthly_records.rollover.alloc');
    return dest;
  }
  return { ...dest, ...patch };
}

export async function copyMonthItems(
  uid: string,
  fromMonth: string,
  toMonth: string,
  existingMeta?: MonthMeta,
): Promise<PopulateResult> {
  const { count, error: destErr } = await itemsQuery()
    .select('id', { count: 'exact', head: true })
    .eq('user_id', uid)
    .eq('month', toMonth);
  if (destErr) {
    logSupabaseError(destErr, 'public.budget_items.copy.dest');
    return { skipped: true, inserted: [], meta: existingMeta ?? null };
  }
  if ((count ?? 0) > 0) {
    return { skipped: true, inserted: [], meta: existingMeta ?? null };
  }

  const { data: sourceRows, error: srcErr } = await itemsQuery()
    .select('*')
    .eq('user_id', uid)
    .eq('month', fromMonth);
  if (srcErr) {
    console.error('[PGRST] public.budget_items.rollover.source', srcErr.message, srcErr);
    logSupabaseError(srcErr, 'public.budget_items.rollover.source');
    return { skipped: true, inserted: [], meta: existingMeta ?? null };
  }
  const source = (sourceRows ?? [])
    .map((row) => toEntry(row as Record<string, unknown>, uid))
    .filter(isRolloverSourceEntry);
  if (source.length === 0) {
    return { skipped: true, inserted: [], meta: existingMeta ?? null };
  }
  const meta = existingMeta ?? await ensureMonthRow(uid, toMonth);
  const insertedRows = await insertCopies(uid, toMonth, source, asUuidOrNull(meta.id));
  const inserted = await applyCopyMetadata(uid, source, insertedRows);
  const nextMeta = await copyAllocFromPrevious(uid, fromMonth, meta);
  return { skipped: false, inserted, meta: nextMeta };
}

async function insertStarterSavings(uid: string, month: string, monthId: string | null): Promise<Entry[]> {
  const rows = SAVINGS_BUCKETS.map((b) =>
    entryWritePayload({
      userId: uid,
      month,
      category: 'savings',
      name: b.name,
      amount: 0,
      monthlyRecordId: monthId,
      paid: false,
    }),
  );
  let { data, error } = await itemsQuery().insert(rows).select();
  if (error && /monthly_record_id|schema cache|column/i.test(error.message)) {
    const retry = await itemsQuery().insert(
      SAVINGS_BUCKETS.map((b) =>
        entryWritePayload({ userId: uid, month, category: 'savings', name: b.name, amount: 0, paid: false }),
      ),
    ).select();
    data = retry.data;
    error = retry.error;
  }
  if (error || !data) {
    console.error('[PGRST] public.budget_items.starter.insert', error?.message, error);
    logSupabaseError(error, 'public.budget_items.starter.insert');
    return [];
  }
  return (data as Record<string, unknown>[]).map((row) => toEntry(row, uid));
}

/**
 * If `targetMonth` has no budget rows, copy the latest preceding month
 * (minus Ingående balans, with paid reset). Templates are only used when
 * the user has no budget history at all.
 */
export async function populateEmptyMonth(userId: string, targetMonth: string): Promise<PopulateResult> {
  const uid = asUuidOrNull(userId);
  if (!uid || !/^\d{4}-\d{2}$/.test(targetMonth)) {
    return { skipped: true, inserted: [], meta: null };
  }

  return withMonthLock(`${uid}:${targetMonth}`, async () => {
    const { count, error: countErr } = await itemsQuery()
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('month', targetMonth);
    if (countErr) {
      console.error('[PGRST] public.budget_items.rollover.count', countErr.message, countErr);
      logSupabaseError(countErr, 'public.budget_items.rollover.count');
      return { skipped: true, inserted: [], meta: null };
    }
    if ((count ?? 0) > 0) {
      return { skipped: true, inserted: [], meta: null };
    }

    const { data: monthKeys, error: keysErr } = await itemsQuery()
      .select('month')
      .eq('user_id', uid);
    if (keysErr) {
      console.error('[PGRST] public.budget_items.rollover.months', keysErr.message, keysErr);
      logSupabaseError(keysErr, 'public.budget_items.rollover.months');
      return { skipped: true, inserted: [], meta: null };
    }

    const prev = latestPrecedingMonth(
      (monthKeys ?? []).map((row) => monthKeyFromRow(row as Record<string, unknown>)),
      targetMonth,
    );

    const meta = await ensureMonthRow(uid, targetMonth);
    const monthId = asUuidOrNull(meta.id);

    if (prev) {
      return copyMonthItems(uid, prev, targetMonth, meta);
    }

    const { count: globalCount, error: globalErr } = await itemsQuery()
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid);
    if (globalErr) {
      logSupabaseError(globalErr, 'public.budget_items.rollover.global');
      return { skipped: true, inserted: [], meta };
    }
    if ((globalCount ?? 0) > 0) {
      return { skipped: true, inserted: [], meta };
    }

    const inserted = await insertStarterSavings(uid, targetMonth, monthId);
    return { skipped: false, inserted, meta };
  });
}
