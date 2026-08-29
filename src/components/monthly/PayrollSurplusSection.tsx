import { useEffect, useId, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { MonthMeta, SAVINGS_BUCKETS } from '@/lib/types';
import { formatKr } from '@/lib/format';

interface Props {
  meta: MonthMeta;
  savingsNames: string[];
  onCommitBalance: (value: number) => void;
  onOpenModal: () => void;
}

function formatSavingsList(names: string[]): string {
  const unique = names.map((n) => n.trim()).filter(Boolean);
  if (unique.length === 0) return formatSavingsList(SAVINGS_BUCKETS.map((b) => b.name));
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) return `${unique[0]} och ${unique[1]}`;
  return `${unique.slice(0, -1).join(', ')} och ${unique[unique.length - 1]}`;
}

export default function PayrollSurplusSection({
  meta, savingsNames, onCommitBalance, onOpenModal,
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
    <section className="card relative z-[1] grid min-w-0 gap-6 p-5 sm:p-6 md:grid-cols-2 animate-fade-in">
      <div>
        <label htmlFor={inputId} className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          Kvar på lönekontot vid nästa lön
        </label>
        <p className="mt-1 text-xs text-zinc-500">
          Faktiskt saldo – räknas inte in i nettoresultatet.
        </p>
        <div className="field relative z-[1] mt-4 flex items-center gap-2 px-4 py-3.5">
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
            className="relative z-[1] stat-num min-w-0 flex-1 bg-transparent pr-2 text-right text-2xl text-zinc-50 outline-none"
          />
          <span className="pointer-events-none shrink-0 text-sm text-zinc-500">kr</span>
        </div>
      </div>

      <div className="relative z-[1] flex flex-col justify-center rounded-2xl border border-teal-400/15 bg-teal-400/[0.06] p-5 sm:p-6">
        <div className="flex items-center gap-2 text-teal-200">
          <Sparkles className="h-5 w-5" />
          <h3 className="font-display font-semibold">Verkställ överskott</h3>
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          Fördela automatiskt <b className="text-teal-300">{formatKr(Math.max(0, meta.ending_balance))}</b> mellan {formatSavingsList(savingsNames)}.
        </p>
        <button
          type="button"
          onClick={onOpenModal}
          className="btn-primary relative z-[1] mt-4 w-full sm:w-auto sm:self-start"
        >
          Verkställ överskott
        </button>
      </div>
    </section>
  );
}
