import { Entry, MonthMeta } from './types';

export interface MonthTotals {
  income: number;
  fixed: number;
  variable: number;
  savings: number;
  expenses: number; // fixed + variable
  outflow: number; // fixed + variable + savings
  net: number; // income - outflow
  savingsRate: number; // savings / income (0-1)
}

export function totalsFor(entries: Entry[]): MonthTotals {
  const sum = (cat: string) =>
    entries.filter((e) => e.category === cat).reduce((a, e) => a + e.amount, 0);

  const income = sum('income');
  const fixed = sum('fixed');
  const variable = sum('variable');
  const savings = sum('savings');
  const expenses = fixed + variable;
  const outflow = expenses + savings;

  return {
    income,
    fixed,
    variable,
    savings,
    expenses,
    outflow,
    // Netto = inkomst − levnadskostnader − planerat sparande. Saldo på lönekontot (överskott) ingår inte.
    net: income - outflow,
    savingsRate: income > 0 ? savings / income : 0,
  };
}

/** Minsta netto som ska vara kvar efter förslag att öka sparandet (10 % av inkomst, aldrig under 0). */
export function netFloor(income: number): number {
  if (income <= 0) return 0;
  return Math.round(income * 0.1);
}

/**
 * Belopp som kan flyttas till sparrader utan att netto blir negativt.
 * Förslag visas bara när netto överstiger 10 % av inkomsten.
 */
export function amountToBoostSavings(totals: MonthTotals): number {
  if (totals.net <= 0 || totals.income <= 0) return 0;
  const floor = netFloor(totals.income);
  return Math.max(0, totals.net - floor);
}

/** Fördelar ett heltal proportionellt utan att summan överstiger `total`. */
export function splitProportionally(total: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0 || total <= 0) return Array.from({ length: n }, () => 0);

  const positive = weights.map((w) => Math.max(0, w));
  const weightSum = positive.reduce((a, b) => a + b, 0);
  const basis = weightSum > 0 ? positive : Array.from({ length: n }, () => 1);
  const basisSum = basis.reduce((a, b) => a + b, 0);

  const parts = basis.map((w) => Math.floor((total * w) / basisSum));
  let leftover = total - parts.reduce((a, b) => a + b, 0);
  const order = basis
    .map((w, i) => ({ i, frac: (total * w) / basisSum - parts[i] }))
    .sort((a, b) => b.frac - a.frac);

  for (const { i } of order) {
    if (leftover <= 0) break;
    parts[i] += 1;
    leftover -= 1;
  }
  return parts;
}

export interface HealthScore {
  total: number;
  savingsRate: number;
  netMargin: number;
  endingBalance: number;
  savingsRatePct: number;
  netMarginPct: number;
  endingBalanceKr: number;
}

export const HEALTH_CAPS = {
  savingsRate: 40,
  netMargin: 40,
  endingBalance: 20,
} as const;

export type HealthFactor = keyof typeof HEALTH_CAPS;

/**
 * Saldo före lön for health/AI: persisted roll-over after Verkställ,
 * otherwise the current "Kvar på lönekontot" input.
 */
export function effectiveCarriedOverBalance(
  meta: Pick<MonthMeta, 'carried_over_balance' | 'ending_balance'>,
): number {
  const carried = Math.max(0, Number(meta.carried_over_balance) || 0);
  if (carried > 0) return carried;
  return Math.max(0, Number(meta.ending_balance) || 0);
}

/** Poäng 0–100 enbart från innevarande månads budget och saldo före lön. */
export function healthScore(entries: Entry[], endingBalance: number): HealthScore {
  const t = totalsFor(entries);
  const income = t.income;
  const savingsRatePct = income > 0 ? t.savings / income : 0;
  const netMarginPct = income > 0 ? (income - t.expenses) / income : 0;
  const endingBalanceKr = Number(endingBalance) || 0;

  const savingsPts = scaledPoints(savingsRatePct, 0.2, HEALTH_CAPS.savingsRate);
  const marginPts = scaledPoints(netMarginPct, 0.15, HEALTH_CAPS.netMargin);
  const balancePts = endingBalanceKr > 0 ? HEALTH_CAPS.endingBalance : 0;

  return {
    total: savingsPts + marginPts + balancePts,
    savingsRate: savingsPts,
    netMargin: marginPts,
    endingBalance: balancePts,
    savingsRatePct,
    netMarginPct,
    endingBalanceKr,
  };
}

export function lowestHealthFactors(score: HealthScore): HealthFactor[] {
  const ranked: { key: HealthFactor; ratio: number }[] = [
    { key: 'savingsRate', ratio: score.savingsRate / HEALTH_CAPS.savingsRate },
    { key: 'netMargin', ratio: score.netMargin / HEALTH_CAPS.netMargin },
    { key: 'endingBalance', ratio: score.endingBalance / HEALTH_CAPS.endingBalance },
  ].sort((a, b) => a.ratio - b.ratio);

  const weak = ranked.filter((f) => f.ratio < 1).slice(0, 2);
  return (weak.length > 0 ? weak : ranked.slice(0, 1)).map((f) => f.key);
}

export function healthTips(score: HealthScore): string[] {
  const tips: Record<HealthFactor, string> = {
    savingsRate:
      'Sikta på att spara minst 20 % av inkomsten. Höj målinriktat sparande eller sänk rörliga utgifter.',
    netMargin:
      'Nettomarginalen efter levnadskostnader bör vara minst 15 %. Se över fasta och rörliga kostnader.',
    endingBalance:
      'Fyll i ett positivt saldo sista dagen innan lön. Det visar att lönekontot inte är tomt när nästa lön kommer.',
  };
  if (score.total === 100) {
    return ['Alla tre delarna är i topp den här månaden. Fortsätt med samma rutin.'];
  }
  return lowestHealthFactors(score).map((key) => tips[key]);
}

function scaledPoints(ratio: number, fullAt: number, max: number): number {
  if (ratio <= 0 || fullAt <= 0) return 0;
  return Math.round(Math.min(max, (ratio / fullAt) * max));
}

export function scoreColor(value: number): string {
  if (value >= 70) return 'emerald';
  if (value >= 40) return 'amber';
  return 'rose';
}
