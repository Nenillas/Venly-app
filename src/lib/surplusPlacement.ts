const STORAGE_KEY = 'venly.surplusSectionDockedUntil';
export const SURPLUS_DOCK_DAYS = 20;
const DOCK_MS = SURPLUS_DOCK_DAYS * 24 * 60 * 60 * 1000;

export function readDockedUntil(): number {
  if (typeof localStorage === 'undefined') return 0;
  const raw = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
  return Number.isFinite(raw) ? raw : 0;
}

export function isSurplusSectionPinnedTop(now = Date.now()): boolean {
  return now >= readDockedUntil();
}

export function dockSurplusSection(now = Date.now()): number {
  const until = now + DOCK_MS;
  localStorage.setItem(STORAGE_KEY, String(until));
  return until;
}
