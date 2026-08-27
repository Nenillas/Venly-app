import { Entry } from './types';
import { totalsFor, MonthTotals, healthScore, healthTips } from './calculations';
import { formatKr, formatPercent, monthLabel } from './format';

export function generateInsight(
  month: string,
  months: string[],
  byMonth: Map<string, Entry[]>,
  endingBalance: number,
): string[] {
  const monthEntries = byMonth.get(month) ?? [];
  const cur = totalsFor(monthEntries);
  const score = healthScore(monthEntries, endingBalance);
  if (cur.income === 0 && cur.expenses === 0) {
    return [
      `Det finns ännu inga poster för ${monthLabel(month)}.`,
      'Lägg till dina inkomster och kostnader under Månadsöversikt.',
      'Så snart du fyllt i lite data ger jag dig en skräddarsydd analys.',
    ];
  }

  const past = months.filter((m) => m < month);
  const avg = averageTotals(past.map((m) => totalsFor(byMonth.get(m) ?? [])));

  const sentences: string[] = [];

  sentences.push(
    `Hälsobetyget för ${monthLabel(month)} är ${score.total} av 100 (Sparkvot ${score.savingsRate}/40p, Nettomarginal ${score.netMargin}/40p, Saldo före lön ${score.endingBalance}/20p).`,
  );

  if (cur.net >= 0) {
    sentences.push(
      `Du gick plus med ${formatKr(cur.net)} och sparade ${formatPercent(cur.savingsRate * 100)} av inkomsten.`,
    );
  } else {
    sentences.push(
      `Du gick back ${formatKr(Math.abs(cur.net))} – utgifter och sparande översteg inkomsten.`,
    );
  }

  if (avg) {
    const varDiff = cur.variable - avg.variable;
    const fixedDiff = cur.fixed - avg.fixed;
    const biggest = Math.abs(varDiff) >= Math.abs(fixedDiff)
      ? { label: 'rörliga kostnader', diff: varDiff }
      : { label: 'fasta kostnader', diff: fixedDiff };
    if (Math.abs(biggest.diff) < 200) {
      sentences.push('Dina kostnader ligger stabilt i linje med de senaste månaderna.');
    } else if (biggest.diff > 0) {
      sentences.push(`Dina ${biggest.label} var ${formatKr(biggest.diff)} högre än snittet – här finns mest att hämta.`);
    } else {
      sentences.push(`Bra jobbat: dina ${biggest.label} var ${formatKr(Math.abs(biggest.diff))} lägre än snittet.`);
    }

    const rateDiff = cur.savingsRate - avg.savingsRate;
    if (rateDiff > 0.01) {
      sentences.push(`Sparkvoten steg ${formatPercent(rateDiff * 100, 1)} jämfört med snittet – trenden pekar uppåt.`);
    } else if (rateDiff < -0.01) {
      sentences.push(`Sparkvoten sjönk ${formatPercent(Math.abs(rateDiff) * 100, 1)} mot snittet – värt att se över nästa månad.`);
    } else {
      sentences.push('Ditt sparande är jämnt och förutsägbart, vilket bygger en stabil buffert över tid.');
    }
  } else {
    sentences.push(`Dina fasta kostnader är ${formatKr(cur.fixed)} och rörliga ${formatKr(cur.variable)}.`);
    sentences.push('När du lagt in fler månader kan jag jämföra mot dina egna trender.');
  }

  sentences.push(...healthTips(score));
  return sentences;
}

function averageTotals(list: MonthTotals[]): MonthTotals | null {
  if (list.length === 0) return null;
  const acc = list.reduce(
    (a, t) => ({
      income: a.income + t.income,
      fixed: a.fixed + t.fixed,
      variable: a.variable + t.variable,
      savings: a.savings + t.savings,
      savingsRate: a.savingsRate + t.savingsRate,
    }),
    { income: 0, fixed: 0, variable: 0, savings: 0, savingsRate: 0 },
  );
  const n = list.length;
  const income = acc.income / n;
  const fixed = acc.fixed / n;
  const variable = acc.variable / n;
  const savings = acc.savings / n;
  return {
    income, fixed, variable, savings,
    expenses: fixed + variable,
    outflow: fixed + variable + savings,
    net: income - fixed - variable - savings,
    savingsRate: acc.savingsRate / n,
  };
}
