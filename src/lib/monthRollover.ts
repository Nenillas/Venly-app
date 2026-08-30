import { isCarryInIncomeName, type Entry } from './types';

/** Ingående balans is month-specific (Verkställ) and must not roll over. */
export function isRolloverSourceEntry(entry: Pick<Entry, 'category' | 'name'>): boolean {
  return !isCarryInIncomeName(entry.name);
}

export function latestPrecedingMonth(months: string[], target: string): string | null {
  const earlier = [...new Set(months.filter((m) => /^\d{4}-\d{2}$/.test(m) && m < target))].sort();
  return earlier.length > 0 ? earlier[earlier.length - 1] : null;
}

const inflight = new Map<string, Promise<unknown>>();

export function withMonthLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const run = fn().finally(() => inflight.delete(key));
  inflight.set(key, run);
  return run;
}
