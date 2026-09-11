import { useMemo, useState } from 'react';
import {
  CalendarDays, ChevronDown, ChevronLeft, ChevronRight, HeartPulse, Landmark,
  PiggyBank, Target, Wallet,
} from 'lucide-react';
import { Entry, MonthMeta } from '@/lib/types';
import { addMonths, formatPercent, monthLabel } from '@/lib/format';
import {
  HEALTH_CAPS,
  effectiveCarriedOverBalance,
  healthNextMove,
  healthScore,
  healthTier,
  type HealthFactor,
  type HealthScore as Score,
  type HealthTone,
} from '@/lib/calculations';
import { SensitiveKr, sensitiveKrText } from '@/components/SensitiveKr';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

interface Props {
  month: string;
  onMonthChange: (month: string) => void;
  entries: Entry[];
  getMeta: (month: string) => MonthMeta;
}

const TONE: Record<HealthTone, { text: string; bar: string; ring: string; badge: string; dot: string }> = {
  emerald: {
    text: 'text-emerald-300',
    bar: 'bg-emerald-400/80',
    ring: 'text-emerald-400',
    badge: 'bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-400/25',
    dot: 'bg-emerald-400',
  },
  sky: {
    text: 'text-sky-300',
    bar: 'bg-sky-400/80',
    ring: 'text-sky-400',
    badge: 'bg-sky-400/10 text-sky-200 ring-1 ring-sky-400/25',
    dot: 'bg-sky-400',
  },
  amber: {
    text: 'text-amber-300',
    bar: 'bg-amber-400/80',
    ring: 'text-amber-400',
    badge: 'bg-amber-400/10 text-amber-200 ring-1 ring-amber-400/25',
    dot: 'bg-amber-400',
  },
  orange: {
    text: 'text-orange-300',
    bar: 'bg-orange-400/80',
    ring: 'text-orange-400',
    badge: 'bg-orange-400/10 text-orange-200 ring-1 ring-orange-400/25',
    dot: 'bg-orange-400',
  },
  rose: {
    text: 'text-rose-300',
    bar: 'bg-rose-400/80',
    ring: 'text-rose-400',
    badge: 'bg-rose-400/10 text-rose-200 ring-1 ring-rose-400/25',
    dot: 'bg-rose-400',
  },
};

const FACTORS: {
  key: HealthFactor;
  label: string;
  icon: typeof Percent;
  hint: (s: Score) => string;
}[] = [
  {
    key: 'savingsRate',
    label: 'Sparkvot',
    icon: PiggyBank,
    hint: (s) => `${formatPercent(s.savingsRatePct * 100, 1)} av inkomsten · 35p vid ≥ 20 %`,
  },
  {
    key: 'fixedRatio',
    label: 'Fasta kostnader',
    icon: Landmark,
    hint: (s) => `${formatPercent(s.fixedRatioPct * 100, 1)} av inkomsten · 35p vid ≤ 50 %`,
  },
  {
    key: 'surplus',
    label: 'Månadsmarginal',
    icon: Wallet,
    hint: (s) => s.net > 0 ? 'Positivt netto efter utgifter och sparande · 15p' : s.net === 0 ? 'Netto 0 kr · 10p' : 'Underskott · 0p',
  },
  {
    key: 'endingBalance',
    label: 'Saldo före lön',
    icon: CalendarDays,
    hint: (s) => s.income > 0 && s.endingBalanceKr > s.income * 0.1
      ? 'Över 10 % av inkomsten till nästa lön · 15p'
      : s.endingBalanceKr > 0
        ? 'Positivt utrymme till nästa lön · 8p'
        : 'Inget utrymme till nästa lön · 0p',
  },
];

function nextMoveCopy(score: Score, privacy: boolean): string {
  if (score.income <= 0) {
    return 'Lägg till inkomster och kostnader under Månadsöversikt för att få ett hälsobetyg.';
  }
  const move = healthNextMove(score);
  if (!move.nextTier) {
    return 'Du är Ekonomisk Mästare den här månaden. Behåll sparkvot och fasta kostnader.';
  }
  const next = move.nextTier.name;
  const kr = move.amountKr > 0 ? sensitiveKrText(move.amountKr, privacy) : null;
  if (move.factor === 'savingsRate') {
    return kr
      ? `Öka målinriktat sparande med ${kr} för att nå nästa nivå: ${next}.`
      : `Höj sparkvoten mot 20 % av inkomsten för att nå nästa nivå: ${next}.`;
  }
  if (move.factor === 'fixedRatio') {
    return kr
      ? `Sänk dina fasta kostnader med ${kr} för att nå nästa nivå: ${next}.`
      : `Håll fasta kostnader på högst 50 % av inkomsten för att nå nästa nivå: ${next}.`;
  }
  if (move.factor === 'surplus') {
    return kr
      ? `Justera utgifter eller sparande med ${kr} så att netto blir positivt — nästa nivå: ${next}.`
      : `Få ett positivt månadsresultat för att nå nästa nivå: ${next}.`;
  }
  return kr
    ? `Sikta på minst ${kr} i saldo före lön (över 10 % av inkomsten) för att nå nästa nivå: ${next}.`
    : `Bygg saldo före lön över 10 % av inkomsten för att nå nästa nivå: ${next}.`;
}

export default function InsightView({ month, onMonthChange, entries, getMeta }: Props) {
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const [open, setOpen] = useState(false);
  const monthEntries = useMemo(
    () => entries.filter((e) => e.month === month),
    [entries, month],
  );
  const score = useMemo(
    () => healthScore(monthEntries, effectiveCarriedOverBalance(getMeta(month)), 'operational'),
    [monthEntries, getMeta, month],
  );
  const tier = healthTier(score.total);
  const tone = TONE[tier.tone];
  const next = healthNextMove(score);
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score.total / 100) * circ;

  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:flex sm:items-center sm:justify-between sm:p-6 animate-fade-in">
        <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
          <button type="button" onClick={() => onMonthChange(addMonths(month, -1))} className="icon-btn">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 text-center sm:min-w-[11rem] sm:flex-none">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-300">Hälsobetyg</div>
            <div className="font-display text-lg font-bold capitalize text-zinc-50">{monthLabel(month)}</div>
          </div>
          <button type="button" onClick={() => onMonthChange(addMonths(month, 1))} className="icon-btn">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </header>

      <section className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6 animate-slide-up">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative mx-auto shrink-0 sm:mx-0">
            <svg width="148" height="148" className="-rotate-90" aria-hidden="true">
              <circle cx="74" cy="74" r={r} fill="none" strokeWidth="12" className="stroke-zinc-800" />
              <circle
                cx="74" cy="74" r={r} fill="none" strokeWidth="12" strokeLinecap="round"
                className={`${tone.ring} transition-all duration-700`}
                stroke="currentColor"
                strokeDasharray={circ}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={`stat-num text-4xl text-zinc-50`}>{score.total}</div>
              <div className="text-[11px] uppercase tracking-wide text-zinc-400">av 100</div>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-zinc-300">
              <HeartPulse className={`h-5 w-5 ${tone.text}`} />
              <span className="text-xs font-medium uppercase tracking-wide">Nivå</span>
            </div>
            <div className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${tone.badge}`}>
              <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
              {tier.name}
            </div>
            <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full ${tone.bar} transition-all duration-700`}
                style={{ width: `${Math.min(100, score.total)}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-zinc-300">
              {next.nextTier
                ? `${next.pointsToNext} p kvar till ${next.nextTier.name}.`
                : 'Maxnivå nådd den här månaden.'}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6 animate-slide-up">
        <div className="flex items-center gap-2 text-zinc-50">
          <Target className="h-5 w-5 text-indigo-300" />
          <h2 className="font-display text-lg font-bold">Nästa drag</h2>
        </div>
        <p className="mt-3 text-base leading-relaxed text-zinc-100">
          {nextMoveCopy(score, isPrivacyModeEnabled)}
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6 animate-slide-up">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 text-left"
          aria-expanded={open}
        >
          <span className="font-display text-lg font-bold text-zinc-50">Poängfördelning</span>
          <ChevronDown className={`h-5 w-5 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="mt-5 space-y-4">
            {FACTORS.map((m) => {
              const pts = score[m.key];
              const max = HEALTH_CAPS[m.key];
              const ft = TONE[healthTier((pts / max) * 100).tone];
              return (
                <div key={m.key}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2 text-zinc-100">
                      <m.icon className="h-4 w-4 shrink-0 text-zinc-400" />
                      {m.label}
                    </span>
                    <span className={`tabular-nums font-semibold ${ft.text}`}>{pts}/{max}p</span>
                  </div>
                  <p className="mb-1.5 text-xs text-zinc-400">{m.hint(score)}</p>
                  {m.key === 'surplus' && (
                    <p className="mb-1.5 text-xs text-zinc-500">Netto: <SensitiveKr value={score.net} /></p>
                  )}
                  {m.key === 'endingBalance' && (
                    <p className="mb-1.5 text-xs text-zinc-500">Saldo: <SensitiveKr value={score.endingBalanceKr} /></p>
                  )}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div className={`h-full rounded-full ${ft.bar}`} style={{ width: `${(pts / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
