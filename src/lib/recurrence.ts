import type { Entry } from './types';
import type { Recurrence } from './types';

export const RECURRENCE_MONTHS: Record<Exclude<Recurrence, 'none'>, number> = {
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

export function monthIndex(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return y * 12 + (m - 1);
}

export function isRecurrenceDue(
  recurrence: Recurrence | undefined,
  anchor: string | null | undefined,
  month: string,
): boolean {
  if (!recurrence || recurrence === 'none') return true;
  const start = anchor && /^\d{4}-\d{2}$/.test(anchor) ? anchor : month;
  const delta = monthIndex(month) - monthIndex(start);
  if (delta < 0) return false;
  return delta % RECURRENCE_MONTHS[recurrence] === 0;
}

export function entryAmountForMonth(entry: Pick<Entry, 'amount' | 'recurrence' | 'recurrence_anchor' | 'month'>): number {
  if (!isRecurrenceDue(entry.recurrence, entry.recurrence_anchor, entry.month)) return 0;
  return Number(entry.amount) || 0;
}
