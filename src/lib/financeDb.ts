import { requireSupabase } from '@/lib/supabase/client';
import { Category, Entry, MonthMeta, PaymentType, Recurrence, canonicalItemName, parseRecurrence } from '@/lib/types';
import { logSupabaseError } from '@/lib/supabaseErrors';

export const MONTHS_TABLE = 'monthly_records' as const;
export const ENTRIES_TABLE = 'budget_items' as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UUID_KEYS = new Set(['id', 'user_id', 'monthly_record_id', 'month_id']);

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

/** Empty string and invalid UUIDs must not be sent to Postgres uuid columns. */
export function asUuidOrNull(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return isUuid(s) ? s : null;
}

export function omitInvalidUuids(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    const isUuidField = UUID_KEYS.has(key) || key.endsWith('_id');
    if (!isUuidField) {
      if (value === undefined) continue;
      out[key] = value;
      continue;
    }
    if (key === 'user_id') {
      const uid = asUuidOrNull(value);
      if (uid) out.user_id = uid;
      continue;
    }
    if (value === undefined) continue;
    out[key] = asUuidOrNull(value);
  }
  return out;
}

export const MONTHS_TABLES = [MONTHS_TABLE] as const;
export const ENTRIES_TABLES = [ENTRIES_TABLE] as const;

export type MonthsTable = typeof MONTHS_TABLE;
export type EntriesTable = typeof ENTRIES_TABLE;

export function getMonthsTable(): MonthsTable {
  return MONTHS_TABLE;
}

export function getEntriesTable(): EntriesTable {
  return ENTRIES_TABLE;
}

/** PostgREST default schema is public — query tables by name only. */
export function monthsQuery() {
  return requireSupabase().from('monthly_records');
}

export function itemsQuery() {
  return requireSupabase().from('budget_items');
}

export async function queryUserRows(
  table: MonthsTable | EntriesTable,
  userId: string,
  orderColumn?: string,
): Promise<{ table: string; data: Record<string, unknown>[] }> {
  if (!isUuid(userId)) {
    throw new Error('Saknar giltigt användar-id.');
  }
  const from = () => requireSupabase().from(table);
  let { data, error } = orderColumn
    ? await from().select('*').eq('user_id', userId).order(orderColumn)
    : await from().select('*').eq('user_id', userId);

  if (error && orderColumn) {
    console.error('[PGRST]', `${table}.order(${orderColumn})`, error.message, error);
    logSupabaseError(error, `${table}.order:${orderColumn}`);
    const retry = await from().select('*').eq('user_id', userId);
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error('[PGRST]', table, error.message, error.code, error.details, error.hint);
    logSupabaseError(error, `public.${table}`);
    throw error;
  }

  return { table, data: (data ?? []) as Record<string, unknown>[] };
}

export function monthKeyFromRow(row: Record<string, unknown>): string {
  const raw = String(row.month ?? '');
  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  const year = Number(row.year);
  const monthNum = Number(row.month);
  if (year > 0 && monthNum >= 1 && monthNum <= 12) {
    return `${year}-${String(monthNum).padStart(2, '0')}`;
  }
  return raw;
}

export function normalizeMeta(row: Record<string, unknown>): MonthMeta {
  return {
    id: String(row.id ?? ''),
    month: monthKeyFromRow(row),
    ending_balance: Number(row.ending_balance) || 0,
    carried_over_balance: Number(row.carried_over_balance) || 0,
    alloc_buffer: Number(row.alloc_buffer) || 0,
    alloc_avanza: Number(row.alloc_avanza) || 0,
    alloc_travel: Number(row.alloc_travel) || 0,
  };
}

export function parsePaymentType(row: Record<string, unknown>): PaymentType {
  const raw = String(row.payment_type ?? '');
  if (raw === 'autogiro' || raw === 'card_pot' || raw === 'invoice') return raw;
  if (Boolean(row.is_autogiro)) return 'autogiro';
  return 'invoice';
}

export function parseRecurrenceAnchor(row: Record<string, unknown>): string | null {
  const raw = String(row.recurrence_anchor ?? '');
  return /^\d{4}-\d{2}$/.test(raw) ? raw : null;
}

export function normalizeEntry(row: Record<string, unknown>): Entry {
  const category = row.category as Category;
  return {
    id: String(row.id ?? ''),
    month: monthKeyFromRow(row),
    category,
    name: canonicalItemName(category, String(row.name ?? row.title ?? '')),
    amount: Number(row.amount) || 0,
    paid: Boolean(row.paid ?? row.is_paid),
    payment_type: parsePaymentType(row),
    recurrence: parseRecurrence(row.recurrence),
    recurrence_anchor: parseRecurrenceAnchor(row),
  };
}

export function entryWritePayload(input: {
  userId: string;
  month: string;
  category: Category;
  name: string;
  amount: number;
  payment_type?: PaymentType;
  recurrence?: Recurrence;
  recurrence_anchor?: string | null;
  monthlyRecordId?: string | null;
  paid?: boolean;
}): Record<string, unknown> {
  const user_id = asUuidOrNull(input.userId);
  if (!user_id) {
    throw new Error('Saknar giltigt användar-id — kan inte spara till databasen.');
  }
  const payload: Record<string, unknown> = {
    user_id,
    month: input.month,
    category: input.category,
    name: canonicalItemName(input.category, input.name),
    amount: input.amount,
  };
  const monthlyRecordId = asUuidOrNull(input.monthlyRecordId);
  if (monthlyRecordId) payload.monthly_record_id = monthlyRecordId;
  if (input.payment_type) payload.payment_type = input.payment_type;
  if (input.paid === false) payload.paid = false;
  if (input.recurrence && input.recurrence !== 'none') {
    payload.recurrence = input.recurrence;
    payload.recurrence_anchor = input.recurrence_anchor ?? input.month;
  }
  return omitInvalidUuids(payload);
}

export function monthWritePayload(input: {
  userId: string;
  month: string;
  ending_balance?: number;
  carried_over_balance?: number;
  alloc_buffer?: number;
  alloc_avanza?: number;
  alloc_travel?: number;
}): Record<string, unknown> {
  const user_id = asUuidOrNull(input.userId);
  if (!user_id) {
    throw new Error('Saknar giltigt användar-id — kan inte spara till databasen.');
  }
  return omitInvalidUuids({
    user_id,
    month: input.month,
    ending_balance: input.ending_balance,
    carried_over_balance: input.carried_over_balance,
    alloc_buffer: input.alloc_buffer,
    alloc_avanza: input.alloc_avanza,
    alloc_travel: input.alloc_travel,
  });
}
