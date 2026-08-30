import { useMemo, useState } from 'react';
import { X, PiggyBank, TrendingUp, Plane, Target, Sparkles, Check } from 'lucide-react';
import { MonthMeta, resolveSavingsTargets, SAVINGS_TARGETS, type Entry, type SavingsTarget } from '@/lib/types';
import { MonthTotals, savingsSplitWeights, splitProportionally } from '@/lib/calculations';
import { SensitiveKr } from '@/components/SensitiveKr';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

export type SurplusAllocation = { id: string | null; name: string; amount: number };
export type SurplusModalVariant = 'payroll' | 'boost';

interface Props {
  meta: MonthMeta;
  totals: MonthTotals;
  surplus: number;
  savingsRows: Entry[];
  variant?: SurplusModalVariant;
  onClose: () => void;
  onSaveRules: (patch: Partial<MonthMeta>) => Promise<void>;
  onApply: (allocations: SurplusAllocation[], leftover: number) => Promise<void>;
}

const ICONS = [PiggyBank, TrendingUp, Plane, Target];
const COLORS = [
  { text: 'text-teal-300', bar: 'bg-teal-400/80' },
  { text: 'text-sky-300', bar: 'bg-sky-400/80' },
  { text: 'text-amber-300', bar: 'bg-amber-400/80' },
  { text: 'text-zinc-300', bar: 'bg-zinc-400/70' },
];

function initialPercents(targets: SavingsTarget[], meta: MonthMeta, usingDefaults: boolean): number[] {
  if (usingDefaults && targets.length === 3) {
    const saved = [meta.alloc_buffer, meta.alloc_avanza, meta.alloc_travel].map((n) => Math.max(0, Math.round(Number(n) || 0)));
    const savedSum = saved.reduce((a, b) => a + b, 0);
    if (savedSum >= 1 && savedSum <= 100) return saved;
  }
  return splitProportionally(100, savingsSplitWeights(targets));
}

function initialAmounts(targets: SavingsTarget[], meta: MonthMeta, usingDefaults: boolean, surplus: number): number[] {
  const percents = initialPercents(targets, meta, usingDefaults);
  const sum = percents.reduce((a, b) => a + b, 0);
  const allocated = surplus > 0 && sum >= 1 && sum <= 100 ? Math.round((surplus * sum) / 100) : 0;
  return splitProportionally(allocated, percents.map((p) => Math.max(0, p)));
}

function parseKr(raw: string): number {
  const n = Number(String(raw).replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

export default function SurplusModal({
  meta, totals, surplus, savingsRows, variant = 'payroll', onClose, onSaveRules, onApply,
}: Props) {
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const isBoost = variant === 'boost';
  const targets = useMemo(() => resolveSavingsTargets(savingsRows), [savingsRows]);
  const usingDefaults = savingsRows.filter((e) => e.name.trim()).length === 0;
  const [amounts, setAmounts] = useState(() => initialAmounts(targets, meta, usingDefaults, surplus));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const allocatedKr = amounts.reduce((a, n) => a + Math.max(0, n), 0);
  const leftoverKr = surplus - allocatedKr;
  const overLimit = leftoverKr < 0;
  const remainingPct = surplus > 0 ? Math.max(0, Math.round((Math.max(0, leftoverKr) / surplus) * 100)) : 0;
  const allocatedPct = surplus > 0 ? Math.round((Math.max(0, allocatedKr) / surplus) * 100) : 0;
  const livingCosts = totals.expenses;
  const valid = !overLimit && allocatedKr >= 1 && allocatedKr <= surplus && surplus > 0 && targets.length > 0;

  const rowPercent = (index: number) => {
    if (surplus <= 0) return 0;
    return Math.round((Math.max(0, amounts[index] ?? 0) / surplus) * 100);
  };

  const setAmount = (index: number, value: number) => {
    setAmounts((prev) => prev.map((n, i) => (i === index ? Math.max(0, Math.round(value)) : n)));
  };

  const setPercent = (index: number, pct: number) => {
    const next = Math.max(0, Math.min(100, Math.round(pct)));
    setAmount(index, Math.round((surplus * next) / 100));
  };

  const apply = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      if (!isBoost && usingDefaults && amounts.length === 3) {
        const percents = amounts.map((n) => (surplus > 0 ? Math.round((Math.max(0, n) / surplus) * 100) : 0));
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
          amount: amounts[i] ?? 0,
        })),
        Math.max(0, leftoverKr),
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
        <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-zinc-300 hover:bg-white/5 hover:text-zinc-50">
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-400/10 text-teal-300">
            <Sparkles className="h-6 w-6" />
          </span>
          <div>
            <h2 className="font-display text-xl font-bold text-zinc-50">
              {isBoost ? 'Fördela överskott' : 'Verkställ överskott'}
            </h2>
            <p className="text-sm text-zinc-300">
              {isBoost
                ? 'Fördela belopp eller andel på dina rader under målinriktat sparande. Det som inte fördelas lämnas i nettoresultatet.'
                : usingDefaults
                  ? `Inga sparanderader ännu – förslag enligt ${SAVINGS_TARGETS.buffer}, ${SAVINGS_TARGETS.avanza} och ${SAVINGS_TARGETS.travel}`
                  : 'Fördela belopp eller andel på dina rader under målinriktat sparande. Resten stannar på lönekontot.'}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-black/20 p-4">
            <div className="text-xs text-zinc-300">{isBoost ? 'Nettoresultat' : 'Faktiska levnadskostnader'}</div>
            <div className="stat-num mt-1 text-lg text-zinc-50">
              <SensitiveKr value={isBoost ? totals.net : livingCosts} />
            </div>
          </div>
          <div className="rounded-2xl border border-teal-400/15 bg-teal-400/[0.06] p-4">
            <div className="text-xs text-teal-100">Överskott att fördela</div>
            <div className="stat-num mt-1 text-lg text-teal-200"><SensitiveKr value={surplus} /></div>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 hidden grid-cols-[minmax(0,1fr)_6.5rem_4.25rem] gap-2 px-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400 sm:grid">
            <span>Målinriktat sparande</span>
            <span className="text-right">Belopp</span>
            <span className="text-right">Andel</span>
          </div>
          <div className="space-y-4">
            {targets.map((t, i) => {
              const Icon = ICONS[i % ICONS.length];
              const color = COLORS[i % COLORS.length];
              const pct = rowPercent(i);
              const kr = amounts[i] ?? 0;
              return (
                <div key={t.id ?? `${t.name}-${i}`}>
                  <div className="mb-1.5 flex flex-wrap items-center gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_6.5rem_4.25rem] sm:gap-2">
                    <span className="flex min-w-0 items-center gap-2 text-sm text-zinc-200">
                      <Icon className={`h-4 w-4 shrink-0 ${color.text}`} />
                      <span className="truncate">{t.name}</span>
                    </span>
                    <label className="flex min-w-0 flex-1 items-center gap-1 rounded-xl border border-white/[0.08] bg-black/20 px-2 py-1.5 sm:flex-none">
                      <span className="sr-only">Belopp till {t.name}</span>
                      {isPrivacyModeEnabled ? (
                        <span className={`min-w-0 flex-1 truncate text-right text-sm tabular-nums ${color.text}`}>
                          <SensitiveKr value={kr} />
                        </span>
                      ) : (
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          value={kr}
                          onChange={(e) => setAmount(i, parseKr(e.target.value))}
                          className={`min-w-0 flex-1 bg-transparent text-right text-sm tabular-nums outline-none ${color.text}`}
                        />
                      )}
                      <span className="shrink-0 text-[11px] text-zinc-400">kr</span>
                    </label>
                    <label className="flex w-16 shrink-0 items-center gap-0.5 rounded-xl border border-white/[0.08] bg-black/20 px-2 py-1.5 sm:w-auto">
                      <span className="sr-only">Andel till {t.name}</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={pct}
                        onChange={(e) => setPercent(i, parseKr(e.target.value))}
                        className="min-w-0 w-full bg-transparent text-right text-sm tabular-nums text-zinc-50 outline-none"
                      />
                      <span className="shrink-0 text-[11px] text-zinc-400">%</span>
                    </label>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.min(100, pct)}
                    onChange={(e) => setPercent(i, Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-teal-400"
                    aria-label={`Andel till ${t.name}`}
                  />
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/5">
                    <div className={`h-full ${color.bar} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className={`flex items-center justify-between rounded-2xl px-4 py-2.5 text-sm ${overLimit ? 'bg-rose-300/10 text-rose-200' : 'bg-white/[0.04] text-zinc-300'}`}>
            <span>Summa fördelning</span>
            <span className="tabular-nums font-semibold">
              <SensitiveKr value={allocatedKr} /> · {allocatedPct}%
            </span>
          </div>
          {overLimit ? (
            <p className="text-center text-sm text-rose-200">Total fördelning kan inte överstiga överskottet.</p>
          ) : (
            <>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-teal-400/80 transition-all duration-200"
                  style={{ width: `${surplus > 0 ? Math.min(100, Math.max(0, (allocatedKr / surplus) * 100)) : 0}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-zinc-300">
                <span>
                  Fördelat till sparande: <b className="tabular-nums text-zinc-50">{allocatedPct}%</b>
                  {' '}(<SensitiveKr value={allocatedKr} />)
                </span>
                <span>
                  {isBoost ? 'Kvar ofördelat' : 'Kvar på kontot'}: <b className="tabular-nums text-zinc-50">{remainingPct}%</b>
                  {' '}(<SensitiveKr value={Math.max(0, leftoverKr)} />)
                </span>
              </div>
            </>
          )}
        </div>

        {surplus <= 0 && (
          <p className="mt-3 text-center text-sm text-zinc-300">
            {isBoost
              ? 'Det finns inget överskott att fördela just nu.'
              : 'Ange ett belopp under "Kvar på lönekontot" för att kunna fördela ett överskott.'}
          </p>
        )}

        <button
          type="button"
          onClick={apply}
          disabled={!valid || busy || done}
          className="btn-primary mt-5 flex w-full items-center justify-center gap-2 py-3"
        >
          {done ? (<><Check className="h-5 w-5" /> Fördelat!</>) : busy ? (isBoost ? 'Fördelar…' : 'Verkställer…') : (isBoost ? 'Fördela till sparande' : 'Verkställ fördelning')}
        </button>
      </div>
    </div>
  );
}
