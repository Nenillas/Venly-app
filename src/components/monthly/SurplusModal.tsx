import { useState } from 'react';
import { X, PiggyBank, TrendingUp, Plane, Sparkles, Check } from 'lucide-react';
import { MonthMeta } from '@/lib/types';
import { MonthTotals, splitProportionally } from '@/lib/calculations';
import { formatKr } from '@/lib/format';

interface Props {
  meta: MonthMeta;
  totals: MonthTotals;
  surplus: number;
  onClose: () => void;
  onSaveRules: (patch: Partial<MonthMeta>) => Promise<void>;
  onApply: (amounts: { buffer: number; avanza: number; travel: number }) => Promise<void>;
}

const SPLITS = [
  { key: 'buffer', label: 'Buffert', icon: PiggyBank, color: 'text-emerald-400', bar: 'bg-emerald-400' },
  { key: 'avanza', label: 'Avanza/Nordnet', icon: TrendingUp, color: 'text-sky-400', bar: 'bg-sky-400' },
  { key: 'travel', label: 'Resekonto', icon: Plane, color: 'text-amber-400', bar: 'bg-amber-400' },
] as const;

export default function SurplusModal({ meta, totals, surplus, onClose, onSaveRules, onApply }: Props) {
  const [buffer, setBuffer] = useState(meta.alloc_buffer);
  const [avanza, setAvanza] = useState(meta.alloc_avanza);
  const [travel, setTravel] = useState(meta.alloc_travel);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const pct = { buffer, avanza, travel };
  const sum = buffer + avanza + travel;
  const livingCosts = totals.expenses;
  const [bufferAmt, avanzaAmt, travelAmt] = splitProportionally(surplus, [buffer, avanza, travel]);
  const amounts = { buffer: bufferAmt, avanza: avanzaAmt, travel: travelAmt };

  const valid = sum === 100 && surplus > 0;

  const apply = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await onSaveRules({ alloc_buffer: buffer, alloc_avanza: avanza, alloc_travel: travel });
      await onApply(amounts);
      setDone(true);
      setTimeout(onClose, 1100);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(message, err);
    } finally {
      setBusy(false);
    }
  };

  const setter = { buffer: setBuffer, avanza: setAvanza, travel: setTravel };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-lg card p-6 animate-scale-in">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-200">
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-400">
            <Sparkles className="h-6 w-6" />
          </span>
          <div>
            <h2 className="font-display text-xl font-bold text-slate-50">Verkställ överskott</h2>
            <p className="text-sm text-slate-500">Fördela det som blev kvar automatiskt</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-black/25 p-4">
            <div className="text-xs text-slate-500">Faktiska levnadskostnader</div>
            <div className="stat-num mt-1 text-lg text-slate-200">{formatKr(livingCosts)}</div>
          </div>
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
            <div className="text-xs text-emerald-300/80">Överskott att fördela</div>
            <div className="stat-num mt-1 text-lg text-emerald-400">{formatKr(surplus)}</div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {SPLITS.map(({ key, label, icon: Icon, color, bar }) => (
            <div key={key}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-300">
                  <Icon className={`h-4 w-4 ${color}`} /> {label}
                </span>
                <span className="tabular-nums text-slate-400">
                  <b className={color}>{formatKr(amounts[key])}</b> · {pct[key]}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={0} max={100} step={5} value={pct[key]}
                  onChange={(e) => setter[key](Number(e.target.value))}
                  className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-emerald-400"
                />
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/5">
                <div className={`h-full ${bar} transition-all`} style={{ width: `${pct[key]}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className={`mt-4 flex items-center justify-between rounded-xl px-4 py-2.5 text-sm ${sum === 100 ? 'bg-white/5 text-slate-400' : 'bg-rose-500/10 text-rose-300'}`}>
          <span>Summa fördelning</span>
          <span className="tabular-nums font-semibold">{sum}%</span>
        </div>

        {surplus <= 0 && (
          <p className="mt-3 text-center text-sm text-slate-500">
            Ange ett belopp under "Kvar på lönekontot" för att kunna fördela ett överskott.
          </p>
        )}

        <button
          type="button"
          onClick={apply}
          disabled={!valid || busy || done}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {done ? (<><Check className="h-5 w-5" /> Fördelat!</>) : busy ? 'Verkställer…' : 'Verkställ fördelning'}
        </button>
      </div>
    </div>
  );
}
