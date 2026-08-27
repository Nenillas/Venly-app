import { useEffect, useId, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { MonthMeta } from '@/lib/types';
import { formatKr } from '@/lib/format';

interface Props {
  meta: MonthMeta;
  onCommitBalance: (value: number) => void;
  onOpenModal: () => void;
}

export default function PayrollSurplusSection({
  meta, onCommitBalance, onOpenModal,
}: Props) {
  const inputId = useId();
  const [value, setValue] = useState(String(meta.ending_balance ?? 0));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setValue(String(meta.ending_balance ?? 0));
  }, [meta.ending_balance, focused]);

  const commit = () => {
    const next = Math.max(0, Math.round(Number(String(value).replace(',', '.')) || 0));
    setValue(String(next));
    onCommitBalance(next);
  };

  return (
    <section className="card relative z-[1] grid gap-5 p-5 md:grid-cols-2 animate-fade-in">
      <div>
        <label htmlFor={inputId} className="text-sm font-medium text-slate-300">
          Kvar på lönekontot vid nästa lön
        </label>
        <p className="mt-0.5 text-xs text-slate-500">
          Faktiskt saldo – räknas inte in i nettoresultatet.
        </p>
        <div className="relative z-[1] mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 focus-within:border-emerald-400/60">
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              commit();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            className="relative z-[1] min-w-0 flex-1 bg-transparent pr-2 text-right text-lg tabular-nums text-slate-100 outline-none"
          />
          <span className="pointer-events-none shrink-0 text-sm text-slate-500">kr</span>
        </div>
      </div>

      <div className="relative z-[1] flex flex-col justify-center rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-5">
        <div className="flex items-center gap-2 text-emerald-300">
          <Sparkles className="h-5 w-5" />
          <h3 className="font-display font-semibold">Verkställ Överskott</h3>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Fördela automatiskt <b className="text-emerald-400">{formatKr(Math.max(0, meta.ending_balance))}</b> mellan buffert, Avanza och resekonto.
        </p>
        <button
          type="button"
          onClick={onOpenModal}
          className="relative z-[1] mt-4 self-start rounded-xl bg-emerald-500 px-5 py-2.5 font-semibold text-emerald-950 transition hover:bg-emerald-400"
        >
          Verkställ Överskott
        </button>
      </div>
    </section>
  );
}
