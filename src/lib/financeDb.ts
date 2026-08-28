import { requireSupabase } from '@/lib/supabase/client';
import { Category, Entry, MonthMeta, PaymentType } from '@/lib/types';
import { logSupabaseError } from '@/lib/supabaseErrors';

export const MONTHS_TABLE = 'monthly_records' as const;
export const ENTRIES_TABLE = 'budget_items' as const;

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

export function normalizeEntry(row: Record<string, unknown>): Entry {
  return {
    id: String(row.id ?? ''),
    month: monthKeyFromRow(row),
    category: row.category as Category,
    name: String(row.name ?? row.title ?? ''),
    amount: Number(row.amount) || 0,
    paid: Boolean(row.paid ?? row.is_paid),
    payment_type: parsePaymentType(row),
  };
}

export function entryWritePayload(input: {
  userId: string;
  month: string;
  category: Category;
  name: string;
  amount: number;
  payment_type?: PaymentType;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    user_id: input.userId,
    month: input.month,
    category: input.category,
    name: input.name,
    amount: input.amount,
  };
  if (input.payment_type) payload.payment_type = input.payment_type;
  return payload;
}
