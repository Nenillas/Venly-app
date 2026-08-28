export type Category = 'income' | 'fixed' | 'variable' | 'savings';
export type PaymentType = 'invoice' | 'autogiro' | 'card_pot';

export interface Entry {
  id: string;
  month: string;
  category: Category;
  name: string;
  amount: number;
  paid: boolean;
  payment_type: PaymentType;
}

export interface MonthMeta {
  id: string;
  month: string;
  ending_balance: number;
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

export function isExpense(category: Category): boolean {
  return category === 'fixed' || category === 'variable';
}

export const CARRY_IN_INCOME_NAME = 'Ingående balans';

export const CARRY_IN_INCOME_HELP =
  "Denna rad visar den totala summan som fördelats från 'Kvar på lönekontot vid nästa löning'. Summan läggs till under inkomster för att balansera det målinriktade sparandet så att månadens nettoresultat blir korrekt.";

export function isCarryInIncome(entry: Pick<Entry, 'category' | 'name'>): boolean {
  return entry.category === 'income' && entry.name.trim().toLowerCase() === CARRY_IN_INCOME_NAME.toLowerCase();
}

export const SAVINGS_TARGETS = {
  buffer: 'Buffert',
  avanza: 'Avanza/Nordnet',
  travel: 'Resekonto',
} as const;

export const SAVINGS_BUCKETS = [
  { key: 'buffer', name: SAVINGS_TARGETS.buffer, match: /buffert/i },
  { key: 'avanza', name: SAVINGS_TARGETS.avanza, match: /avanza|nordnet/i },
  { key: 'travel', name: SAVINGS_TARGETS.travel, match: /rese/i },
] as const;
