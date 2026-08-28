import { useMemo } from 'react';
import { Check, CheckSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { Category, CATEGORY_LABELS, Entry } from '@/lib/types';
import { formatKr, formatPercent, monthLabel, addMonths } from '@/lib/format';

interface Props {
  month: string;
  onMonthChange: (month: string) => void;
  entries: Entry[];
  onTogglePaid: (id: string, paid: boolean) => Promise<void>;
}

const COST_CATEGORIES: Category[] = ['fixed', 'variable'];

const TAG = {
  fixed: 'bg-amber-400/10 text-amber-300 ring-amber-400/20',
  variable: 'bg-sky-400/10 text-sky-300 ring-sky-400/20',
} as const;

function paymentAmount(entry: Entry): number {
  const n = Number(entry.amount);
  return Number.isFinite(n) ? n : 0;
}

/** Betalningar list: Faktura only, strictly positive amount. */
export function isBetalningarItem(entry: Entry, month: string): boolean {
  return (
    entry.month === month &&
    COST_CATEGORIES.includes(entry.category) &&
    entry.payment_type === 'invoice' &&
    paymentAmount(entry) > 0
  );
}

export default function PaymentsView({ month, onMonthChange, entries, onTogglePaid }: Props) {
  const bills = useMemo(
    () =>
      entries
        .filter((e) => isBetalningarItem(e, month))
        .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name, 'sv')),
    [entries, month],
  );

  const paidCount = bills.filter((e) => e.paid).length;
  const total = bills.length;
  const remaining = bills.filter((e) => !e.paid).reduce((a, e) => a + paymentAmount(e), 0);
  const pct = total === 0 ? 0 : Math.round((paidCount / total) * 100);

  return (
    <div className="space-y-6">
      <header className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onMonthChange(addMonths(month, -1))}
            className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-white/10"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-[11rem] text-center">
            <div className="text-xs uppercase tracking-wide text-slate-500">Betalningar</div>
            <div className="font-display text-lg font-bold capitalize text-slate-50">{monthLabel(month)}</div>
          </div>
          <button
            onClick={() => onMonthChange(addMonths(month, 1))}
            className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-white/10"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </header>

      <section className="card p-5 animate-slide-up">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-400">
            <CheckSquare className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold text-slate-50">
              {total === 0
                ? 'Inga fakturor att betala manuellt'
                : `${paidCount} av ${total} räkningar betalda (${formatPercent(pct)})`}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {total === 0
                ? 'Endast fakturor över 0 kr visas. Autogiro, kortköp och nollbelopp räknas inte med.'
                : <>Kvar att betala: <b className="text-slate-200">{formatKr(remaining)}</b></>}
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {bills.length === 0 ? (
        <div className="card grid place-items-center p-12 text-center text-slate-500">
          <CheckSquare className="mb-3 h-10 w-10 opacity-40" />
          <p>Inga fakturor över 0 kr att bocka av.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {bills.map((bill) => (
            <BillRow key={bill.id} bill={bill} onToggle={onTogglePaid} />
          ))}
        </ul>
      )}
    </div>
  );
}

function BillRow({
  bill,
  onToggle,
}: {
  bill: Entry;
  onToggle: (id: string, paid: boolean) => Promise<void>;
}) {
  const paid = bill.paid;
  const tagClass = TAG[bill.category as 'fixed' | 'variable'];

  return (
    <li>
      <button
        type="button"
        onClick={() => onToggle(bill.id, !paid)}
        className={`card flex w-full items-center gap-3 p-4 text-left transition ${
          paid ? 'opacity-60' : 'hover:border-white/10'
        }`}
      >
        <span
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${
            paid
              ? 'border-emerald-400/40 bg-emerald-400 text-emerald-950'
              : 'border-white/15 bg-black/20'
          }`}
        >
          {paid && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className={`font-medium ${paid ? 'text-slate-400 line-through' : 'text-slate-100'}`}>
            {bill.name}
          </div>
          <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${tagClass}`}>
            {CATEGORY_LABELS[bill.category]}
          </span>
        </div>
        <div className={`stat-num shrink-0 text-base ${paid ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
          {formatKr(paymentAmount(bill))}
        </div>
      </button>
    </li>
  );
}
