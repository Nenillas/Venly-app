import { useEffect, useState } from 'react';
import { ShieldCheck, Percent, Wallet, Landmark, PiggyBank, Info, X, Lightbulb } from 'lucide-react';
import {
  HealthScore as Score,
  HEALTH_CAPS,
  HealthFactor,
  healthTips,
  healthTier,
  type HealthTone,
} from '@/lib/calculations';
import { formatPercent } from '@/lib/format';

const COLOR: Record<HealthTone, { text: string; bar: string; ring: string; badge: string }> = {
  emerald: { text: 'text-emerald-300', bar: 'bg-emerald-400/80', ring: 'text-emerald-400', badge: 'bg-emerald-400/10 text-emerald-200' },
  sky: { text: 'text-sky-300', bar: 'bg-sky-400/80', ring: 'text-sky-400', badge: 'bg-sky-400/10 text-sky-200' },
  amber: { text: 'text-amber-300', bar: 'bg-amber-400/80', ring: 'text-amber-400', badge: 'bg-amber-400/10 text-amber-200' },
  orange: { text: 'text-orange-300', bar: 'bg-orange-400/80', ring: 'text-orange-400', badge: 'bg-orange-400/10 text-orange-200' },
  rose: { text: 'text-rose-300', bar: 'bg-rose-400/70', ring: 'text-rose-400', badge: 'bg-rose-400/10 text-rose-200' },
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
    hint: (s) => s.net > 0 ? 'Positivt netto · 15p' : s.net === 0 ? 'Netto 0 kr · 10p' : 'Underskott · 0p',
  },
  {
    key: 'endingBalance',
    label: 'Saldo före lön',
    icon: Percent,
    hint: (s) => s.endingBalanceKr > 0
      ? (s.income > 0 && s.endingBalanceKr > s.income * 0.1 ? 'Över 10 % av inkomsten · 15p' : 'Positivt saldo · 8p')
      : 'Inget utrymme till nästa lön · 0p',
  },
];

export default function HealthScore({ score }: { score: Score }) {
  const [open, setOpen] = useState(false);
  const tier = healthTier(score.total);
  const c = COLOR[tier.tone];
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score.total / 100) * circ;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-left animate-slide-up transition-all duration-200 hover:border-zinc-700 sm:p-6"
      >
        <div className="flex items-center justify-between gap-2 text-zinc-100">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-300" />
            <h2 className="font-display text-lg font-bold">Hälsobetyg</h2>
          </span>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-800 text-zinc-300">
            <Info className="h-4 w-4" />
          </span>
        </div>

        <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <div className="relative shrink-0">
            <svg width="140" height="140" className="-rotate-90">
              <circle cx="70" cy="70" r={r} fill="none" strokeWidth="12" className="stroke-zinc-800" />
              <circle
                cx="70" cy="70" r={r} fill="none" strokeWidth="12" strokeLinecap="round"
                className={`${c.ring} transition-all duration-700`}
                stroke="currentColor"
                strokeDasharray={circ}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={`stat-num text-4xl ${c.text}`}>{score.total}</div>
              <div className="text-[11px] uppercase tracking-wide text-zinc-400">av 100</div>
            </div>
          </div>

          <div className="w-full flex-1 space-y-4">
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${c.badge}`}>
              {tier.name}
            </div>
            {FACTORS.map((m) => {
              const pts = score[m.key];
              const max = HEALTH_CAPS[m.key];
              const mc = COLOR[healthTier((pts / max) * 100).tone];
              return (
                <div key={m.key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex min-w-0 items-center gap-2 text-zinc-100">
                      <m.icon className="h-4 w-4 text-zinc-400" /> {m.label}
                    </span>
                    <span className={`tabular-nums font-semibold ${mc.text}`}>{pts}/{max}p</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div className={`h-full rounded-full ${mc.bar} transition-all duration-700`} style={{ width: `${(pts / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-zinc-400">Tryck för att se hur betyget räknas.</p>
          </div>
        </div>
      </button>

      {open && <HealthScoreModal score={score} onClose={() => setOpen(false)} />}
    </>
  );
}

function HealthScoreModal({ score, onClose }: { score: Score; onClose: () => void }) {
  const tips = healthTips(score);
  const tier = healthTier(score.total);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="health-score-title">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative max-h-[min(90vh,90dvh)] w-full max-w-lg overflow-y-auto overflow-x-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6 animate-scale-in">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-zinc-300 hover:bg-white/5 hover:text-zinc-50"
          aria-label="Stäng"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-400/10 text-teal-300">
            <Info className="h-5 w-5" />
          </span>
          <div>
            <h2 id="health-score-title" className="font-display text-xl font-bold text-zinc-50">Hur beräknas ditt betyg?</h2>
            <p className="text-sm text-zinc-300">{score.total} av 100 · {tier.name}</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {FACTORS.map((m) => {
            const pts = score[m.key];
            const max = HEALTH_CAPS[m.key];
            const mc = COLOR[healthTier((pts / max) * 100).tone];
            return (
              <div key={m.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-zinc-50">
                    <m.icon className="h-4 w-4 text-zinc-400" /> {m.label}
                  </span>
                  <span className={`tabular-nums font-semibold ${mc.text}`}>{pts}/{max}p</span>
                </div>
                <p className="mb-1.5 text-xs text-zinc-300">{m.hint(score)}</p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div className={`h-full rounded-full ${mc.bar}`} style={{ width: `${(pts / max) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
          <div className="mb-2 flex items-center gap-2 text-amber-300">
            <Lightbulb className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Tips för den här månaden</h3>
          </div>
          <ul className="space-y-2">
            {tips.map((tip) => (
              <li key={tip} className="flex gap-2 text-sm leading-relaxed text-zinc-200">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
