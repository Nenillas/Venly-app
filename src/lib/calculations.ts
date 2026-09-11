import { canonicalItemName, isCarryInIncome, type Entry, type MonthMeta } from './types';
import { entryAmountForMonth } from './recurrence';

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

/** Ingående balans booked as income for a month (Verkställ överskott). */
export function carryInIncomeAmount(entries: Entry[]): number {
  return entries
    .filter((e) => isCarryInIncome(e))
    .reduce((a, e) => a + Math.max(0, Number(e.amount) || 0), 0);
}

export type TotalsMode = 'ledger' | 'operational';

/**
 * `ledger`: all budget rows, including Ingående balans (keeps month view net-neutral after Verkställ).
 * `operational`: actual earned income — Ingående balans is removed from income and the same
 * amount from savings so net/cash-flow stay consistent.
 */
export function totalsFor(entries: Entry[], mode: TotalsMode = 'ledger'): MonthTotals {
  const sum = (cat: string) =>
    entries.filter((e) => e.category === cat).reduce((a, e) => a + entryAmountForMonth(e), 0);

  let income = sum('income');
  const fixed = sum('fixed');
  const variable = sum('variable');
  let savings = sum('savings');
  const expenses = fixed + variable;

  if (mode === 'operational') {
    const carry = carryInIncomeAmount(entries);
    income = Math.max(0, income - carry);
    savings = Math.max(0, savings - carry);
  }

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

export type SavingsCut = { id: string; name: string; reduce: number; remaining: number };

/** Reduce existing non-zero savings rows to cover a negative net (underskott). */
export function deficitSavingsCuts(net: number, savingsRows: Entry[]): SavingsCut[] {
  const need = Math.abs(Math.round(Number(net) || 0));
  if (need <= 0) return [];
  const funded = savingsRows.filter((e) => e.category === 'savings' && (Number(e.amount) || 0) > 0);
  if (funded.length === 0) return [];
  const parts = splitProportionally(need, funded.map((e) => Number(e.amount) || 0));
  return funded
    .map((e, i) => {
      const amount = Number(e.amount) || 0;
      const reduce = Math.min(amount, parts[i] ?? 0);
      return { id: e.id, name: canonicalItemName('savings', e.name), reduce, remaining: amount - reduce };
    })
    .filter((c) => c.reduce > 0);
}

/** Weights for surplus split: current balances if any, otherwise even. */
export function savingsSplitWeights(targets: { amount: number }[]): number[] {
  const amounts = targets.map((t) => Math.max(0, Number(t.amount) || 0));
  if (amounts.some((a) => a > 0)) return amounts;
  return targets.map(() => 1);
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

export const HEALTH_CAPS = {
  savingsRate: 35,
  fixedRatio: 35,
  surplus: 15,
  endingBalance: 15,
} as const;

export type HealthFactor = keyof typeof HEALTH_CAPS;

export interface HealthScore {
  total: number;
  savingsRate: number;
  fixedRatio: number;
  surplus: number;
  endingBalance: number;
  savingsRatePct: number;
  fixedRatioPct: number;
  net: number;
  endingBalanceKr: number;
  income: number;
  /** @deprecated alias of surplus — kept for older call sites */
  netMargin: number;
  netMarginPct: number;
}

export type HealthTierId = 'master' | 'resilient' | 'stable' | 'tight' | 'warning';
export type HealthTone = 'emerald' | 'sky' | 'amber' | 'orange' | 'rose';

export interface HealthTier {
  id: HealthTierId;
  min: number;
  name: string;
  tone: HealthTone;
}

export const HEALTH_TIERS: HealthTier[] = [
  { id: 'master', min: 90, name: 'Ekonomisk Mästare', tone: 'emerald' },
  { id: 'resilient', min: 75, name: 'Stresstålig & Trygg', tone: 'sky' },
  { id: 'stable', min: 55, name: 'Stabil Vardag', tone: 'amber' },
  { id: 'tight', min: 35, name: 'Sårbar / Tight', tone: 'orange' },
  { id: 'warning', min: 0, name: 'Varningszon', tone: 'rose' },
];

export function healthTier(total: number): HealthTier {
  const n = Math.max(0, Math.min(100, Math.round(Number(total) || 0)));
  return HEALTH_TIERS.find((t) => n >= t.min) ?? HEALTH_TIERS[HEALTH_TIERS.length - 1];
}

export function nextHealthTier(total: number): HealthTier | null {
  const current = healthTier(total);
  const i = HEALTH_TIERS.findIndex((t) => t.id === current.id);
  return i > 0 ? HEALTH_TIERS[i - 1] : null;
}

/**
 * Saldo före lön for health: persisted roll-over after Verkställ,
 * otherwise the current "Kvar på lönekontot" input.
 */
export function effectiveCarriedOverBalance(
  meta: Pick<MonthMeta, 'carried_over_balance' | 'ending_balance'>,
): number {
  const carried = Math.max(0, Number(meta.carried_over_balance) || 0);
  if (carried > 0) return carried;
  return Math.max(0, Number(meta.ending_balance) || 0);
}

function savingsRatePoints(pct: number): number {
  if (pct >= 0.2) return HEALTH_CAPS.savingsRate;
  if (pct >= 0.1) return 20;
  if (pct >= 0.05) return 10;
  return 0;
}

function fixedRatioPoints(pct: number): number {
  if (pct <= 0.5) return HEALTH_CAPS.fixedRatio;
  if (pct <= 0.65) return 20;
  if (pct <= 0.75) return 10;
  return 0;
}

function surplusPoints(net: number): number {
  if (net > 0) return HEALTH_CAPS.surplus;
  if (net === 0) return 10;
  return 0;
}

function paydayBalancePoints(balance: number, income: number): number {
  if (income > 0 && balance > income * 0.1) return HEALTH_CAPS.endingBalance;
  if (balance > 0) return 8;
  return 0;
}

/** Planned leftover after fixed costs and savings — daily-allowance pool. */
export function plannedPaydayMargin(totals: MonthTotals): number {
  return Math.max(0, Math.round(totals.income - totals.fixed - totals.savings));
}

/** Saldo före lön if filled, otherwise planned cash left until payday. */
export function projectedPaydayBalance(endingBalance: number, totals: MonthTotals): number {
  const saldo = Math.max(0, Math.round(Number(endingBalance) || 0));
  if (saldo > 0) return saldo;
  return plannedPaydayMargin(totals);
}

/** Poäng 0–100 från månadens kassaflöde och saldo före lön. */
export function healthScore(
  entries: Entry[],
  endingBalance: number,
  mode: TotalsMode = 'ledger',
): HealthScore {
  const t = totalsFor(entries, mode);
  const income = t.income;
  const savingsRatePct = income > 0 ? t.savings / income : 0;
  const fixedRatioPct = income > 0 ? t.fixed / income : 1;
  const net = Math.round(t.net);
  const endingBalanceKr = projectedPaydayBalance(endingBalance, t);
  const netMarginPct = income > 0 ? (income - t.expenses) / income : 0;

  const savingsPts = income > 0 ? savingsRatePoints(savingsRatePct) : 0;
  const fixedPts = income > 0 ? fixedRatioPoints(fixedRatioPct) : 0;
  const surplusPts = income > 0 ? surplusPoints(net) : 0;
  const balancePts = income > 0 ? paydayBalancePoints(endingBalanceKr, income) : 0;

  return {
    total: savingsPts + fixedPts + surplusPts + balancePts,
    savingsRate: savingsPts,
    fixedRatio: fixedPts,
    surplus: surplusPts,
    endingBalance: balancePts,
    savingsRatePct,
    fixedRatioPct,
    net,
    endingBalanceKr,
    income,
    netMargin: surplusPts,
    netMarginPct,
  };
}

export function lowestHealthFactors(score: HealthScore): HealthFactor[] {
  const ranked = (Object.keys(HEALTH_CAPS) as HealthFactor[])
    .map((key) => ({ key, ratio: score[key] / HEALTH_CAPS[key] }))
    .sort((a, b) => a.ratio - b.ratio);
  const weak = ranked.filter((f) => f.ratio < 1).slice(0, 2);
  return (weak.length > 0 ? weak : ranked.slice(0, 1)).map((f) => f.key);
}

export function krToNextSavingsBand(score: HealthScore): number {
  const income = score.income;
  const current = Math.round(score.savingsRatePct * income);
  if (income <= 0 || score.savingsRate >= HEALTH_CAPS.savingsRate) return 0;
  const targetPct = score.savingsRate >= 20 ? 0.2 : score.savingsRate >= 10 ? 0.1 : 0.05;
  return Math.max(0, Math.ceil(income * targetPct - current));
}

export function krToNextFixedBand(score: HealthScore): number {
  const income = score.income;
  const current = Math.round(score.fixedRatioPct * income);
  if (income <= 0 || score.fixedRatio >= HEALTH_CAPS.fixedRatio) return 0;
  const targetPct = score.fixedRatio >= 20 ? 0.5 : score.fixedRatio >= 10 ? 0.65 : 0.75;
  return Math.max(0, Math.ceil(current - income * targetPct));
}

export function krToPositiveNet(score: HealthScore): number {
  if (score.surplus >= HEALTH_CAPS.surplus) return 0;
  if (score.net < 0) return Math.abs(score.net);
  return 1;
}

export function krToPaydayBuffer(score: HealthScore): number {
  if (score.endingBalance >= HEALTH_CAPS.endingBalance) return 0;
  const floor = score.income > 0 ? Math.floor(score.income * 0.1) + 1 : 1;
  if (score.endingBalance >= 8) return Math.max(0, floor - score.endingBalanceKr);
  return Math.max(1, floor - score.endingBalanceKr);
}

export interface HealthNextMove {
  factor: HealthFactor | null;
  amountKr: number;
  nextTier: HealthTier | null;
  pointsToNext: number;
}

export function healthNextMove(score: HealthScore): HealthNextMove {
  const next = nextHealthTier(score.total);
  const pointsToNext = next ? Math.max(0, next.min - score.total) : 0;
  if (!next) {
    return { factor: null, amountKr: 0, nextTier: null, pointsToNext: 0 };
  }
  const factor = lowestHealthFactors(score)[0] ?? null;
  const amountKr =
    factor === 'savingsRate' ? krToNextSavingsBand(score) :
    factor === 'fixedRatio' ? krToNextFixedBand(score) :
    factor === 'surplus' ? krToPositiveNet(score) :
    factor === 'endingBalance' ? krToPaydayBuffer(score) : 0;
  return { factor, amountKr, nextTier: next, pointsToNext };
}

export function healthTips(score: HealthScore): string[] {
  const move = healthNextMove(score);
  if (!move.nextTier) {
    return ['Alla delar är i topp den här månaden. Fortsätt med samma rutin.'];
  }
  const tips: Record<HealthFactor, string> = {
    savingsRate:
      'Sikta på att spara minst 20 % av inkomsten. Höj målinriktat sparande eller sänk rörliga utgifter.',
    fixedRatio:
      'Håll fasta kostnader på högst 50 % av inkomsten. Se över hyra, abonnemang och lån.',
    surplus:
      'Månadsresultatet bör vara positivt efter utgifter och sparande. Justera poster så att netto går över noll.',
    endingBalance:
      'Sikta på saldo före lön över 10 % av inkomsten — utrymme tills nästa löning.',
  };
  return lowestHealthFactors(score).map((key) => tips[key]);
}

export function scoreColor(value: number): HealthTone {
  return healthTier(value).tone;
}
