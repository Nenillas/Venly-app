import { useMemo, useState } from 'react';
import { X, PiggyBank, TrendingUp, Plane, Target, Sparkles, Check } from 'lucide-react';
import { MonthMeta, resolveSavingsTargets, SAVINGS_TARGETS, type Entry, type SavingsTarget } from '@/lib/types';
import { MonthTotals, savingsSplitWeights, splitProportionally } from '@/lib/calculations';
import { formatKr } from '@/lib/format';

export type SurplusAllocation = { id: string | null; name: string; amount: number };

interface Props {
  meta: MonthMeta;
  totals: MonthTotals;
  surplus: number;
  savingsRows: Entry[];
  onClose: () => void;
  onSaveRules: (patch: Partial<MonthMeta>) => Promise<void>;
  onApply: (allocations: SurplusAllocation[], leftover: number) => Promise<void>;
}

const ICONS = [PiggyBank, TrendingUp, Plane, Target];
const COLORS = [
  { text: 'text-emerald-400', bar: 'bg-emerald-400' },
  { text: 'text-sky-400', bar: 'bg-sky-400' },
  { text: 'text-amber-400', bar: 'bg-amber-400' },
  { text: 'text-violet-400', bar: 'bg-violet-400' },
];

function initialPercents(targets: SavingsTarget[], meta: MonthMeta, usingDefaults: boolean): number[] {
  if (usingDefaults && targets.length === 3) {
    const saved = [meta.alloc_buffer, meta.alloc_avanza, meta.alloc_travel].map((n) => Math.max(0, Math.round(Number(n) || 0)));
    const savedSum = saved.reduce((a, b) => a + b, 0);
    if (savedSum >= 1 && savedSum <= 100) return saved;
  }
  return splitProportionally(100, savingsSplitWeights(targets));
}

export default function SurplusModal({
  meta, totals, surplus, savingsRows, onClose, onSaveRules, onApply,
}: Props) {
  const targets = useMemo(() => resolveSavingsTargets(savingsRows), [savingsRows]);
  const usingDefaults = savingsRows.filter((e) => e.name.trim()).length === 0;
  const [percents, setPercents] = useState(() => initialPercents(targets, meta, usingDefaults));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const sum = percents.reduce((a, b) => a + b, 0);
  const overLimit = sum > 100;
  const remainingPct = Math.max(0, 100 - sum);
  const allocatedKr = overLimit ? 0 : Math.round((surplus * Math.max(0, sum)) / 100);
  const leftoverKr = Math.max(0, surplus - allocatedKr);
  const parts = splitProportionally(allocatedKr, percents.map((p) => Math.max(0, p)));
  const livingCosts = totals.expenses;
  const valid = !overLimit && sum >= 1 && sum <= 100 && surplus > 0 && targets.length > 0 && allocatedKr > 0;

  const setPercent = (index: number, value: number) => {
    setPercents((prev) => prev.map((p, i) => (i === index ? value : p)));
  };

  const apply = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      if (usingDefaults && percents.length === 3) {
        await onSaveRules({
          alloc_buffer: percents[0],
          alloc_avanza: percents[1],
          alloc_travel: percents[2],
        });
      }
      await onApply(
        targets.map((t, i) => ({
          id: t.id,
          name: t.name,
          amount: parts[i] ?? 0,
        })),
        leftoverKr,
      );
      setDone(true);
      setTimeout(onClose, 1100);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(message, err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative max-h-[min(90vh,90dvh)] w-full max-w-lg overflow-y-auto overflow-x-hidden card p-4 sm:p-6 animate-scale-in">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-200">
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-400">
            <Sparkles className="h-6 w-6" />
          </span>
          <div>
            <h2 className="font-display text-xl font-bold text-slate-50">Verkställ överskott</h2>
            <p className="text-sm text-slate-500">
              {usingDefaults
                ? `Inga sparanderader ännu – förslag enligt ${SAVINGS_TARGETS.buffer}, ${SAVINGS_TARGETS.avanza} och ${SAVINGS_TARGETS.travel}`
                : 'Fördela upp till 100 % på dina rader under målinriktat sparande. Resten stannar på lönekontot.'}
            </p>
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
          {targets.map((t, i) => {
            const Icon = ICONS[i % ICONS.length];
            const color = COLORS[i % COLORS.length];
            const pct = percents[i] ?? 0;
            return (
              <div key={t.id ?? `${t.name}-${i}`}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="flex min-w-0 items-center gap-2 text-slate-300">
                    <Icon className={`h-4 w-4 shrink-0 ${color.text}`} />
                    <span className="truncate">{t.name}</span>
                  </span>
                  <span className="ml-2 shrink-0 tabular-nums text-slate-400">
                    <b className={color.text}>{formatKr(parts[i] ?? 0)}</b> · {pct}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={pct}
                  onChange={(e) => setPercent(i, Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-emerald-400"
                />
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/5">
                  <div className={`h-full ${color.bar} transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 space-y-2">
          <div className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm ${overLimit ? 'bg-rose-500/10 text-rose-300' : 'bg-white/5 text-slate-400'}`}>
            <span>Summa fördelning</span>
            <span className="tabular-nums font-semibold">{sum}%</span>
          </div>
          {overLimit ? (
            <p className="text-center text-sm text-rose-300">Total fördelning kan inte överstiga 100%.</p>
          ) : (
            <>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, sum))}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-slate-500">
                <span>
                  Fördelat till sparande: <b className="tabular-nums text-slate-300">{sum}%</b>
                  {' '}({formatKr(allocatedKr)})
                </span>
                <span>
                  Kvar på kontot: <b className="tabular-nums text-slate-300">{remainingPct}%</b>
                  {' '}({formatKr(leftoverKr)})
                </span>
              </div>
            </>
          )}
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
