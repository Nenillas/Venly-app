import { useEffect, useState } from 'react';
import { ShieldCheck, Percent, Wallet, Landmark, Info, X, Lightbulb } from 'lucide-react';
import {
  HealthScore as Score,
  HEALTH_CAPS,
  HealthFactor,
  healthTips,
  scoreColor,
} from '@/lib/calculations';
import { formatPercent } from '@/lib/format';

const COLOR = {
  emerald: { text: 'text-emerald-400', bar: 'bg-emerald-400', ring: 'text-emerald-400', label: 'Utmärkt' },
  amber: { text: 'text-amber-400', bar: 'bg-amber-400', ring: 'text-amber-400', label: 'Okej' },
  rose: { text: 'text-rose-400', bar: 'bg-rose-400', ring: 'text-rose-400', label: 'Behöver ses över' },
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
    icon: Percent,
    hint: (s) => `${formatPercent(s.savingsRatePct * 100, 1)} av inkomsten · full pott vid 20 %`,
  },
  {
    key: 'netMargin',
    label: 'Nettomarginal',
    icon: Wallet,
    hint: (s) => `${formatPercent(s.netMarginPct * 100, 1)} efter levnadskostnader · full pott vid 15 %`,
  },
  {
    key: 'endingBalance',
    label: 'Saldo före lön',
    icon: Landmark,
    hint: (s) => s.endingBalanceKr > 0 ? 'Positivt saldo innan nästa lön' : 'Inget positivt saldo ifyllt',
  },
];

export default function HealthScore({ score }: { score: Score }) {
  const [open, setOpen] = useState(false);
  const c = COLOR[scoreColor(score.total) as keyof typeof COLOR];
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score.total / 100) * circ;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="card w-full min-w-0 p-4 text-left animate-slide-up transition hover:border-white/10 sm:p-6"
      >
        <div className="flex items-center justify-between gap-2 text-slate-300">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h2 className="font-display text-lg font-bold">Hälsobetyg</h2>
          </span>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-slate-400">
            <Info className="h-4 w-4" />
          </span>
        </div>

        <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <div className="relative shrink-0">
            <svg width="140" height="140" className="-rotate-90">
              <circle cx="70" cy="70" r={r} fill="none" strokeWidth="12" className="stroke-white/5" />
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
              <div className="text-[11px] uppercase tracking-wide text-slate-500">av 100</div>
            </div>
          </div>

          <div className="w-full flex-1 space-y-4">
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${c.text} bg-white/5`}>
              {c.label}
            </div>
            {FACTORS.map((m) => {
              const pts = score[m.key];
              const max = HEALTH_CAPS[m.key];
              const mc = COLOR[scoreColor((pts / max) * 100) as keyof typeof COLOR];
              return (
                <div key={m.key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex min-w-0 items-center gap-2 text-slate-300">
                      <m.icon className="h-4 w-4 text-slate-500" /> {m.label}
                    </span>
                    <span className={`tabular-nums font-semibold ${mc.text}`}>{pts}/{max}p</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                    <div className={`h-full rounded-full ${mc.bar} transition-all duration-700`} style={{ width: `${(pts / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-slate-500">Tryck för att se hur betyget räknas.</p>
          </div>
        </div>
      </button>

      {open && <HealthScoreModal score={score} onClose={() => setOpen(false)} />}
    </>
  );
}

function HealthScoreModal({ score, onClose }: { score: Score; onClose: () => void }) {
  const tips = healthTips(score);

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
      <div className="relative max-h-[min(90vh,90dvh)] w-full max-w-lg overflow-y-auto overflow-x-hidden card p-4 sm:p-6 animate-scale-in">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-200"
          aria-label="Stäng"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-400">
            <Info className="h-5 w-5" />
          </span>
          <div>
            <h2 id="health-score-title" className="font-display text-xl font-bold text-slate-50">Hur beräknas ditt betyg?</h2>
            <p className="text-sm text-slate-500">Totalt {score.total} av 100 poäng den här månaden</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {FACTORS.map((m) => {
            const pts = score[m.key];
            const max = HEALTH_CAPS[m.key];
            const mc = COLOR[scoreColor((pts / max) * 100) as keyof typeof COLOR];
            return (
              <div key={m.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-200">
                    <m.icon className="h-4 w-4 text-slate-500" /> {m.label}
                  </span>
                  <span className={`tabular-nums font-semibold ${mc.text}`}>{pts}/{max}p</span>
                </div>
                <p className="mb-1.5 text-xs text-slate-500">{m.hint(score)}</p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                  <div className={`h-full rounded-full ${mc.bar}`} style={{ width: `${(pts / max) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-xl border border-white/5 bg-white/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-amber-300">
            <Lightbulb className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Tips för den här månaden</h3>
          </div>
          <ul className="space-y-2">
            {tips.map((tip) => (
              <li key={tip} className="flex gap-2 text-sm leading-relaxed text-slate-300">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                {tip}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-600">
          Betyget baseras enbart på månadens budgeterade siffror och inknappade saldo före lön.
        </p>
      </div>
    </div>
  );
}
