function scopedKey(base: string, userId: string): string {
  return `${base}.${userId}`;
}

const PAID_KEY = 'venly.paidEntries';
const AUTOGIRO_KEY = 'venly.autogiroEntries';
const TYPE_KEY = 'venly.paymentTypes';

export function readPaidMap(userId: string): Record<string, boolean> {
  return readFlagMap(scopedKey(PAID_KEY, userId));
}

export function writePaid(userId: string, id: string, paid: boolean): void {
  writeFlag(scopedKey(PAID_KEY, userId), id, paid);
}

export function readAutogiroMap(userId: string): Record<string, boolean> {
  return readFlagMap(scopedKey(AUTOGIRO_KEY, userId));
}

export function readPaymentTypeMap(userId: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(scopedKey(TYPE_KEY, userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writePaymentType(userId: string, id: string, type: string): void {
  const map = readPaymentTypeMap(userId);
  map[id] = type;
  localStorage.setItem(scopedKey(TYPE_KEY, userId), JSON.stringify(map));
}

function readFlagMap(key: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeFlag(key: string, id: string, value: boolean): void {
  const map = readFlagMap(key);
  if (value) map[id] = true;
  else delete map[id];
  localStorage.setItem(key, JSON.stringify(map));
}
