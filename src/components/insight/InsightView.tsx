import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Lightbulb, Sparkles } from 'lucide-react';
import { Entry, MonthMeta } from '@/lib/types';
import { generateInsight, INSIGHT_SYSTEM_MESSAGE } from '@/lib/advisor';
import { addMonths, monthLabel } from '@/lib/format';
import { effectiveCarriedOverBalance } from '@/lib/calculations';

interface Props {
  month: string;
  onMonthChange: (month: string) => void;
  entries: Entry[];
  getMeta: (month: string) => MonthMeta;
}

export default function InsightView({ month, onMonthChange, entries, getMeta }: Props) {
  const months = useMemo(
    () => Array.from(new Set(entries.map((e) => e.month))).sort(),
    [entries],
  );
  const byMonth = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of entries) {
      if (!map.has(e.month)) map.set(e.month, []);
      map.get(e.month)!.push(e);
    }
    return map;
  }, [entries]);

  const meta = getMeta(month);
  const insight = useMemo(
    () =>
      generateInsight({
        month,
        months,
        byMonth,
        carried_over_balance: effectiveCarriedOverBalance(meta),
        ending_balance: meta.ending_balance,
        system: INSIGHT_SYSTEM_MESSAGE,
      }),
    [month, months, byMonth, meta],
  );
  const headline = insight[0] ?? '';
  const recommendations = insight.slice(1);

  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 animate-fade-in">
        <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
          <button
            onClick={() => onMonthChange(addMonths(month, -1))}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-white/10"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 text-center sm:min-w-[11rem] sm:flex-none">
            <div className="text-xs uppercase tracking-wide text-slate-500">AI-insikt</div>
            <div className="font-display text-lg font-bold capitalize text-slate-50">{monthLabel(month)}</div>
          </div>
          <button
            onClick={() => onMonthChange(addMonths(month, 1))}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-white/10"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </header>

      <section className="card relative overflow-hidden p-6 animate-slide-up">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="flex items-center gap-2 text-emerald-300">
          <Sparkles className="h-5 w-5" />
          <h2 className="font-display text-lg font-bold">Månadens AI-insikt</h2>
        </div>
        <p className="mt-4 text-lg leading-relaxed text-slate-100 break-words">{headline}</p>
      </section>

      {recommendations.length > 0 && (
        <section className="card p-6 animate-slide-up">
          <div className="flex items-center gap-2 text-slate-200">
            <Lightbulb className="h-5 w-5 text-amber-300" />
            <h3 className="font-display text-lg font-bold">Rekommendationer</h3>
          </div>
          <div className="mt-4 space-y-3">
            {recommendations.map((s, i) => (
              <p key={i} className="flex gap-3 text-slate-200">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                <span className="leading-relaxed break-words">{s}</span>
              </p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
