import type { MonthTotals } from './calculations';

/** Default Swedish payday. `0` means last calendar day of the month. */
export const DEFAULT_PAYDAY_DATE = 25;
export const LAST_DAY_OF_MONTH = 0;

export type PaydayDate = number;

export function parsePaydayDate(raw: unknown): PaydayDate {
  if (raw === 'last' || raw === 'last_day' || raw === 'sista') return LAST_DAY_OF_MONTH;
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_PAYDAY_DATE;
  if (n === LAST_DAY_OF_MONTH) return LAST_DAY_OF_MONTH;
  const day = Math.round(n);
  if (day >= 1 && day <= 31) return day;
  return DEFAULT_PAYDAY_DATE;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Nominal payday day-of-month, clamped to the month’s length. */
export function nominalPaydayDay(year: number, monthIndex: number, paydayDate: PaydayDate = DEFAULT_PAYDAY_DATE): number {
  const last = lastDayOfMonth(year, monthIndex);
  if (paydayDate === LAST_DAY_OF_MONTH) return last;
  return Math.min(Math.max(1, paydayDate), last);
}

/** Move Saturday → Friday, Sunday → Friday. */
export function adjustPaydayForWeekend(date: Date): Date {
  const d = startOfLocalDay(date);
  const weekday = d.getDay();
  if (weekday === 6) d.setDate(d.getDate() - 1);
  else if (weekday === 0) d.setDate(d.getDate() - 2);
  return d;
}

export function effectivePaydayInMonth(
  year: number,
  monthIndex: number,
  paydayDate: PaydayDate = DEFAULT_PAYDAY_DATE,
): Date {
  const day = nominalPaydayDay(year, monthIndex, paydayDate);
  return adjustPaydayForWeekend(new Date(year, monthIndex, day));
}

/**
 * Next effective payday. If today is on or after this cycle’s payday,
 * count toward the following month’s effective payday.
 */
export function nextPaydayDate(
  from: Date = new Date(),
  paydayDate: PaydayDate = DEFAULT_PAYDAY_DATE,
): Date {
  const start = startOfLocalDay(from);
  const thisCycle = effectivePaydayInMonth(start.getFullYear(), start.getMonth(), paydayDate);
  if (start.getTime() < thisCycle.getTime()) return thisCycle;
  return effectivePaydayInMonth(start.getFullYear(), start.getMonth() + 1, paydayDate);
}

export function remainingDaysUntilPayday(
  from: Date = new Date(),
  paydayDate: PaydayDate = DEFAULT_PAYDAY_DATE,
): number {
  const start = startOfLocalDay(from);
  const payday = nextPaydayDate(start, paydayDate);
  const days = Math.round((payday.getTime() - start.getTime()) / 86_400_000);
  return Math.max(1, days);
}

/** Swedish calendar ordinal: 23:e, 24:e, 25:e, 1:a, 2:a. */
export function swedishDayOrdinal(day: number): string {
  const n = Math.round(day);
  const mod100 = n % 100;
  const mod10 = n % 10;
  const suffix = (mod10 === 1 && mod100 !== 11) || (mod10 === 2 && mod100 !== 12) ? 'a' : 'e';
  return `${n}:${suffix}`;
}

/** Money left to live on after fixed costs and planned savings. */
export function remainingDisposableAmount(totals: MonthTotals): number {
  return Math.max(0, Math.round(totals.income - totals.fixed - totals.savings));
}

export function dailyAllowance(disposable: number, remainingDays: number): number {
  const days = Math.max(1, remainingDays);
  return Math.max(0, disposable / days);
}
