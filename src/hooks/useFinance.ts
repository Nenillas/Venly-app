import { useCallback, useEffect, useState } from 'react';
import { Category, Entry, MonthMeta, SAVINGS_TARGETS, canonicalItemName, isCarryInIncome, isLegacyInvestmentTitle, parseRecurrence } from '@/lib/types';
import { currentMonth } from '@/lib/format';
import { withMonthLock } from '@/lib/monthRollover';
import { populateEmptyMonth, copyMonthItems, type PopulateResult } from '@/lib/populateMonth';
import { readAutogiroMap, readPaidMap, readPaymentTypeMap, readRecurrenceMap, writePaid, writePaymentType, writeRecurrence } from '@/lib/paidStorage';
import {
  ENTRIES_TABLE,
  MONTHS_TABLE,
  asUuidOrNull,
  entryWritePayload,
  isUuid,
  itemsQuery,
  monthWritePayload,
  monthsQuery,
  normalizeEntry as mapEntry,
  normalizeMeta,
  omitInvalidUuids,
  queryUserRows,
} from '@/lib/financeDb';
import { ensureAccessToken } from '@/lib/supabase/session';
import { logSupabaseError, supabaseErrorMessage } from '@/lib/supabaseErrors';

const DEFAULT_META = {
  ending_balance: 0,
  carried_over_balance: 0,
  alloc_buffer: 40,
  alloc_avanza: 40,
  alloc_travel: 20,
};

export function useFinance(userId: string | undefined, sessionReady: boolean) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [months, setMonths] = useState<MonthMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rolloverBusy, setRolloverBusy] = useState(false);

  const load = useCallback(async () => {
    if (!sessionReady || !userId) {
      setEntries([]);
      setMonths([]);
      setLoading(!sessionReady);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const auth = await ensureAccessToken();
      const sessionUserId = asUuidOrNull(auth?.userId) ?? asUuidOrNull(userId);
      if (!sessionUserId) {
        console.error('[PGRST] useFinance.load utan JWT — hoppar över public.monthly_records / public.budget_items');
        setEntries([]);
        setMonths([]);
        setError('Inte inloggad. Logga in igen för att ladda din ekonomi.');
        return;
      }

      await ensureStarterBudget(sessionUserId);

      const [entriesHit, monthsHit] = await Promise.all([
        queryUserRows(ENTRIES_TABLE, sessionUserId, 'created_at'),
        queryUserRows(MONTHS_TABLE, sessionUserId, 'month'),
      ]);

      const legacyInvestmentIds = entriesHit.data
        .filter((row) => String(row.category) === 'savings' && isLegacyInvestmentTitle(String(row.name ?? row.title ?? '')))
        .map((row) => asUuidOrNull(row.id))
        .filter((id): id is string => Boolean(id));
      if (legacyInvestmentIds.length > 0) {
        void Promise.all(
          legacyInvestmentIds.map((id) =>
            itemsQuery()
              .update({ name: SAVINGS_TARGETS.avanza })
              .eq('id', id)
              .eq('user_id', sessionUserId),
          ),
        ).catch((err) => {
          console.error(err instanceof Error ? err.message : err, err);
        });
      }

      setEntries(entriesHit.data.map((row) => normalizeEntry(row, sessionUserId)));
      setMonths(monthsHit.data.map((row) => normalizeMeta(row)));
      setError(null);
    } catch (err) {
      logSupabaseError(err, 'useFinance.load');
      setEntries([]);
      setMonths([]);
      setError(supabaseErrorMessage(err, 'Kunde inte ladda ekonomin.'));
    } finally {
      setLoading(false);
    }
  }, [userId, sessionReady]);

  useEffect(() => {
    void load();
  }, [load]);

  const getMeta = useCallback(
    (month: string): MonthMeta => {
      const found = months.find((m) => m.month === month && isUuid(m.id));
      return found ?? { id: '', month, ...DEFAULT_META };
    },
    [months],
  );

  const monthRecordId = useCallback(
    (month: string) => asUuidOrNull(months.find((m) => m.month === month)?.id),
    [months],
  );

  const ensureMeta = useCallback(
    async (month: string): Promise<MonthMeta> => {
      const uid = asUuidOrNull(userId);
      if (!uid) throw new Error('meta');
      const existing = months.find((m) => m.month === month && isUuid(m.id));
      if (existing) return existing;
      const { data, error: insErr } = await monthsQuery()
        .insert(monthWritePayload({ userId: uid, month, ...DEFAULT_META }))
        .select()
        .maybeSingle();
      if (insErr || !data) {
        const dup = await monthsQuery().select('*').eq('user_id', uid).eq('month', month).maybeSingle();
        if (dup.data) {
          const meta = normalizeMeta(dup.data as Record<string, unknown>);
          setMonths((prev) => {
            const withoutPlaceholder = prev.filter((m) => !(m.month === month && !isUuid(m.id)));
            if (withoutPlaceholder.some((m) => m.id === meta.id)) return withoutPlaceholder;
            return [...withoutPlaceholder, meta];
          });
          return meta;
        }
        console.error('[PGRST] public.monthly_records.insert', insErr?.message, insErr);
        logSupabaseError(insErr, 'public.monthly_records.insert');
        throw new Error(supabaseErrorMessage(insErr, 'Kunde inte skapa månad.'));
      }
      const meta = normalizeMeta(data as Record<string, unknown>);
      setMonths((prev) => {
        const withoutPlaceholder = prev.filter((m) => !(m.month === month && !isUuid(m.id)));
        return [...withoutPlaceholder, meta];
      });
      return meta;
    },
    [months, userId],
  );

  const applyPopulateResult = useCallback((result: PopulateResult) => {
    if (result.inserted.length > 0) {
      setEntries((prev) => {
        const ids = new Set(prev.map((e) => e.id));
        const extra = result.inserted.filter((e) => !ids.has(e.id));
        return extra.length ? [...prev, ...extra] : prev;
      });
    }
    if (result.meta && isUuid(result.meta.id)) {
      const meta = result.meta;
      setMonths((prev) => {
        const withoutPlaceholder = prev.filter((m) => !(m.month === meta.month && !isUuid(m.id)));
        if (withoutPlaceholder.some((m) => m.id === meta.id)) {
          return withoutPlaceholder.map((m) => (m.id === meta.id ? { ...m, ...meta } : m));
        }
        return [...withoutPlaceholder, meta];
      });
    }
  }, []);

  const ensureMonthBudget = useCallback(
    async (month: string) => {
      const uid = asUuidOrNull(userId);
      if (!uid) return;
      setRolloverBusy(true);
      try {
        const result = await populateEmptyMonth(uid, month);
        applyPopulateResult(result);
      } catch (err) {
        logSupabaseError(err, 'ensureMonthBudget');
        setError(supabaseErrorMessage(err, 'Kunde inte skapa nästa månads budget.'));
      } finally {
        setRolloverBusy(false);
      }
    },
    [userId, applyPopulateResult],
  );

  const addEntry = useCallback(
    async (month: string, category: Category, name: string, amount: number) => {
      const uid = asUuidOrNull(userId);
      if (!uid) {
        const message = 'Ingen inloggad användare – kan inte lägga till post.';
        console.error(message);
        throw new Error(message);
      }
      const isCost = category === 'fixed' || category === 'variable';
      const title = canonicalItemName(category, name);
      const tempId = `temp-${crypto.randomUUID()}`;
      const optimistic: Entry = {
        id: tempId,
        month,
        category,
        name: title,
        amount,
        paid: false,
        payment_type: isCost ? 'invoice' : 'invoice',
        recurrence: 'none',
        recurrence_anchor: null,
      };
      setEntries((prev) => [...prev, optimistic]);

      const write = (includeRecordId: boolean) =>
        entryWritePayload({
          userId: uid,
          month,
          category,
          name: title,
          amount,
          payment_type: isCost ? 'invoice' : undefined,
          monthlyRecordId: includeRecordId ? monthRecordId(month) : null,
        });

      try {
        let { data, error: insErr } = await itemsQuery()
          .insert(write(true))
          .select()
          .maybeSingle();
        if (insErr && /monthly_record_id|schema cache|column/i.test(insErr.message)) {
          const retry = await itemsQuery().insert(write(false)).select().maybeSingle();
          data = retry.data;
          insErr = retry.error;
        }
        if (insErr || !data) {
          if (insErr && /payment_type|schema cache|column/i.test(insErr.message)) {
            const retry = await itemsQuery()
              .insert(entryWritePayload({ userId: uid, month, category, name: title, amount }))
              .select()
              .maybeSingle();
            if (retry.data) {
              const entry = normalizeEntry(retry.data as Record<string, unknown>, uid);
              setEntries((prev) =>
                prev.map((e) =>
                  e.id === tempId
                    ? { ...entry, payment_type: isCost ? 'invoice' : entry.payment_type }
                    : e,
                ),
              );
              if (isCost) writePaymentType(uid, entry.id, 'invoice');
              return;
            }
            logSupabaseError(retry.error, 'public.budget_items.insert.retry');
            console.error('[PGRST] public.budget_items.insert.retry', retry.error?.message, retry.error);
          }
          logSupabaseError(insErr, 'public.budget_items.insert');
          console.error('[PGRST] public.budget_items.insert', insErr?.message ?? 'Kunde inte lägga till posten.', insErr);
          setEntries((prev) => prev.filter((e) => e.id !== tempId));
          throw new Error(supabaseErrorMessage(insErr, 'Kunde inte lägga till posten.'));
        }
        setEntries((prev) =>
          prev.map((e) => (e.id === tempId ? normalizeEntry(data as Record<string, unknown>, uid) : e)),
        );
      } catch (err) {
        setEntries((prev) => prev.filter((e) => e.id !== tempId));
        const message = err instanceof Error ? err.message : String(err);
        console.error(message, err);
        throw err;
      }
    },
    [userId, monthRecordId],
  );

  const updateEntry = useCallback(
    async (id: string, patch: Partial<Pick<Entry, 'name' | 'amount' | 'paid' | 'payment_type' | 'recurrence' | 'recurrence_anchor'>>) => {
      const uid = asUuidOrNull(userId);
      if (!uid) return;
      let nextPatch = patch;
      setEntries((prev) => {
        const current = prev.find((e) => e.id === id);
        nextPatch =
          patch.name != null
            ? { ...patch, name: canonicalItemName(current?.category ?? 'income', patch.name) }
            : patch;
        return prev.map((e) => (e.id === id ? { ...e, ...nextPatch } : e));
      });
      if (nextPatch.payment_type) writePaymentType(uid, id, nextPatch.payment_type);
      if (nextPatch.recurrence !== undefined) {
        writeRecurrence(uid, id, {
          recurrence: nextPatch.recurrence,
          recurrence_anchor: nextPatch.recurrence_anchor ?? null,
        });
      }
      const rowId = asUuidOrNull(id);
      if (!rowId) return;
      const payload: Record<string, unknown> = { ...nextPatch };
      if (nextPatch.recurrence === 'none') {
        payload.recurrence = 'none';
        payload.recurrence_anchor = null;
      }
      const { error: updErr } = await itemsQuery()
        .update(omitInvalidUuids(payload))
        .eq('id', rowId)
        .eq('user_id', uid);
      if (updErr) {
        logSupabaseError(updErr, 'public.budget_items.update');
        console.error('[PGRST] public.budget_items.update', updErr.message, updErr);
        if (!/payment_type|is_autogiro|recurrence|schema cache|column/i.test(updErr.message)) {
          setError(supabaseErrorMessage(updErr, 'Kunde inte spara ändringen.'));
        }
      }
    },
    [userId],
  );

  const togglePaid = useCallback(async (id: string, paid: boolean) => {
    const uid = asUuidOrNull(userId);
    if (!uid) return;
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, paid } : e)));
    writePaid(uid, id, paid);
    const rowId = asUuidOrNull(id);
    if (!rowId) return;
    const { error: updErr } = await itemsQuery()
      .update({ paid })
      .eq('id', rowId)
      .eq('user_id', uid);
    if (updErr) {
      console.error('[PGRST] public.budget_items.paid', updErr.message, updErr);
      logSupabaseError(updErr, 'public.budget_items.paid');
      if (!/paid|schema cache|column/i.test(updErr.message)) {
        setError(supabaseErrorMessage(updErr, 'Kunde inte spara betalstatus.'));
      }
    }
  }, [userId]);

  const deleteEntry = useCallback(async (id: string) => {
    const uid = asUuidOrNull(userId);
    if (!uid) return;
    const target = entries.find((e) => e.id === id);
    setEntries((prev) => prev.filter((e) => e.id !== id));

    const rowId = asUuidOrNull(id);
    if (rowId) {
      const { error: delErr } = await itemsQuery()
        .delete()
        .eq('id', rowId)
        .eq('user_id', uid);
      if (delErr) {
        console.error('[PGRST] public.budget_items.delete', delErr.message, delErr);
        logSupabaseError(delErr, 'public.budget_items.delete');
        setError(supabaseErrorMessage(delErr, 'Kunde inte ta bort posten.'));
      }
    }

    if (target && isCarryInIncome(target)) {
      setMonths((prev) =>
        prev.map((m) => (m.month === target.month ? { ...m, carried_over_balance: 0 } : m)),
      );
      const metaId = asUuidOrNull(months.find((m) => m.month === target.month)?.id);
      let q = monthsQuery().update({ carried_over_balance: 0 }).eq('user_id', uid);
      const { error: metaErr } = metaId
        ? await q.eq('id', metaId)
        : await q.eq('month', target.month);
      if (metaErr) {
        console.error('[PGRST] public.monthly_records.carried_over_balance', metaErr.message, metaErr);
        logSupabaseError(metaErr, 'public.monthly_records.carried_over_balance');
      }
    }
  }, [userId, entries, months]);

  const copyMonth = useCallback(
    async (fromMonth: string, toMonth: string) => {
      const uid = asUuidOrNull(userId);
      if (!uid) return;
      try {
        const result = await withMonthLock(`${uid}:${toMonth}`, () => copyMonthItems(uid, fromMonth, toMonth));
        applyPopulateResult(result);
      } catch (err) {
        logSupabaseError(err, 'copyMonth');
        setError(supabaseErrorMessage(err, 'Kunde inte kopiera föregående månad.'));
        throw err;
      }
    },
    [userId, applyPopulateResult],
  );

  const updateMeta = useCallback(
    async (month: string, patch: Partial<Omit<MonthMeta, 'id' | 'month'>>) => {
      const uid = asUuidOrNull(userId);
      if (!uid) {
        console.error('Ingen inloggad användare – kan inte spara månadsvärde.');
        return;
      }
      setMonths((prev) => {
        const found = prev.find((m) => m.month === month);
        if (found) return prev.map((m) => (m.month === month ? { ...m, ...patch } : m));
        return [...prev, { id: '', month, ...DEFAULT_META, ...patch }];
      });
      try {
        const meta = await ensureMeta(month);
        const rowId = asUuidOrNull(meta.id);
        if (!rowId) {
          console.error('[PGRST] public.monthly_records.update utan giltigt id');
          return;
        }
        const { error: updErr } = await monthsQuery()
          .update(omitInvalidUuids({ ...patch }))
          .eq('id', rowId)
          .eq('user_id', uid);
        if (updErr) {
          logSupabaseError(updErr, 'public.monthly_records.update');
          console.error('[PGRST] public.monthly_records.update', updErr.message, updErr);
          setError(supabaseErrorMessage(updErr, 'Kunde inte spara månadsinställningen.'));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(message, err);
        setError(message);
      }
    },
    [ensureMeta, userId],
  );

  return {
    entries,
    months,
    loading,
    error,
    rolloverBusy,
    reload: load,
    getMeta,
    ensureMeta,
    addEntry,
    updateEntry,
    deleteEntry,
    copyMonth,
    updateMeta,
    togglePaid,
    ensureMonthBudget,
  };
}

async function ensureStarterBudget(userId: string) {
  const uid = asUuidOrNull(userId);
  if (!uid) {
    console.error('[PGRST] ensureStarterBudget utan giltigt user_id');
    return;
  }
  try {
    await populateEmptyMonth(uid, currentMonth());
  } catch (err) {
    logSupabaseError(err, 'ensureStarterBudget');
  }
}

function normalizeEntry(row: Record<string, unknown>, userId: string): Entry {
  const mapped = mapEntry(row);
  const id = mapped.id;
  const local = readPaymentTypeMap(userId)[id];
  const paidLocal = readPaidMap(userId);
  const recLocal = readRecurrenceMap(userId)[id];
  let next: Entry = {
    ...mapped,
    paid: mapped.paid || Boolean(paidLocal[id]),
  };
  if (local === 'autogiro' || local === 'card_pot' || local === 'invoice') {
    next = { ...next, payment_type: local };
  } else if (Boolean(readAutogiroMap(userId)[id])) {
    next = { ...next, payment_type: 'autogiro' };
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
