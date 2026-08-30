export type Category = 'income' | 'fixed' | 'variable' | 'savings';
export type PaymentType = 'invoice' | 'autogiro' | 'card_pot';
export type Recurrence = 'none' | 'quarterly' | 'semiannual' | 'annual';
export type RecurrencePeriod = Exclude<Recurrence, 'none'>;
export type PaymentMenuValue = PaymentType | RecurrencePeriod;

export interface Entry {
  id: string;
  month: string;
  category: Category;
  name: string;
  amount: number;
  paid: boolean;
  payment_type: PaymentType;
  recurrence: Recurrence;
  recurrence_anchor: string | null;
}

export interface MonthMeta {
  id: string;
  month: string;
  ending_balance: number;
  carried_over_balance: number;
  alloc_buffer: number;
  alloc_avanza: number;
  alloc_travel: number;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  income: 'Inkomster',
  fixed: 'Fasta kostnader',
  variable: 'Rörliga kostnader',
  savings: 'Målinriktat sparande',
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  invoice: 'Faktura',
  autogiro: 'Autogiro',
  card_pot: 'Kortköp',
};

export const PAYMENT_TYPES: PaymentType[] = ['invoice', 'autogiro', 'card_pot'];

export const RECURRENCE_LABELS: Record<RecurrencePeriod, string> = {
  quarterly: 'Återkommande: Kvartal',
  semiannual: 'Återkommande: Halvår',
  annual: 'Återkommande: År',
};

export const RECURRENCE_BADGE: Record<RecurrencePeriod, string> = {
  quarterly: 'Kvartal',
  semiannual: 'Halvår',
  annual: 'Årlig',
};

export const RECURRENCE_PERIODS: RecurrencePeriod[] = ['quarterly', 'semiannual', 'annual'];

export function isRecurrencePeriod(value: string): value is RecurrencePeriod {
  return value === 'quarterly' || value === 'semiannual' || value === 'annual';
}

export function parseRecurrence(raw: unknown): Recurrence {
  const v = String(raw ?? '');
  if (v === 'quarterly' || v === 'semiannual' || v === 'annual') return v;
  return 'none';
}

export function isExpense(category: Category): boolean {
  return category === 'fixed' || category === 'variable';
}

export type SavingsTarget = {
  id: string | null;
  name: string;
  amount: number;
};

export const CARRY_IN_INCOME_NAME = 'Ingående balans';

export const CARRY_IN_INCOME_HELP =
  "Denna rad visar den totala summan som fördelats från 'Kvar på lönekontot vid nästa löning'. Summan läggs till under inkomster för att balansera det målinriktade sparandet så att månadens nettoresultat blir korrekt.";

export function isCarryInIncome(entry: Pick<Entry, 'category' | 'name'>): boolean {
  return entry.category === 'income' && entry.name.trim().toLowerCase() === CARRY_IN_INCOME_NAME.toLowerCase();
}

export const SAVINGS_TARGETS = {
  buffer: 'Buffert',
  avanza: 'Investeringar',
  travel: 'Resekonto',
} as const;

/** Broker titles from earlier default templates — shown and stored as Investeringar. */
export const LEGACY_INVESTMENT_TITLE = /^(avanza\/nordnet|avanza|nordnet)$/i;

export function isLegacyInvestmentTitle(name: string): boolean {
  return LEGACY_INVESTMENT_TITLE.test(name.trim());
}

export function canonicalItemName(category: Category, name: string): string {
  const trimmed = name.trim();
  if (category === 'savings' && isLegacyInvestmentTitle(trimmed)) {
    return SAVINGS_TARGETS.avanza;
  }
  return trimmed;
}

export const SAVINGS_BUCKETS = [
  { key: 'buffer', name: SAVINGS_TARGETS.buffer, match: /buffert/i },
  { key: 'avanza', name: SAVINGS_TARGETS.avanza, match: /investering|avanza|nordnet/i },
  { key: 'travel', name: SAVINGS_TARGETS.travel, match: /rese/i },
] as const;

/** Active målinriktat sparande rows, or the three default buckets if none exist. */
export function resolveSavingsTargets(savingsRows: Entry[]): SavingsTarget[] {
  const rows = savingsRows
    .filter((e) => e.category === 'savings' && e.name.trim())
    .map((e) => ({
      id: e.id,
      name: canonicalItemName('savings', e.name),
      amount: Number(e.amount) || 0,
    }));
  if (rows.length > 0) return rows;
  return SAVINGS_BUCKETS.map((b) => ({ id: null, name: b.name, amount: 0 }));
}
