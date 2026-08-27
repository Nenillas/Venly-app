const currency = new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK',
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 });

export function formatKr(value: number): string {
  return currency.format(Math.round(value));
}

export function formatNumber(value: number): string {
  return number.format(Math.round(value));
}

export function formatPercent(value: number, digits = 0): string {
  return `${value.toLocaleString('sv-SE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

const MONTH_NAMES = [
  'januari', 'februari', 'mars', 'april', 'maj', 'juni',
  'juli', 'augusti', 'september', 'oktober', 'november', 'december',
];

export function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${year}`;
}

export function monthShort(month: string): string {
  const [, m] = month.split('-').map(Number);
  return MONTH_NAMES[m - 1].slice(0, 3);
}

export function addMonths(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(year, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function currentMonth(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
