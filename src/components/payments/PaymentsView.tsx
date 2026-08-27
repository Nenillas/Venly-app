import { useMemo, useState } from 'react';
import { Check, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, CreditCard, Repeat } from 'lucide-react';
import { Category, CATEGORY_LABELS, Entry, PAYMENT_TYPE_LABELS } from '@/lib/types';
import { formatKr, formatPercent, monthLabel, addMonths } from '@/lib/format';

interface Props {
  month: string;
  onMonthChange: (month: string) => void;
  entries: Entry[];
  onTogglePaid: (id: string, paid: boolean) => Promise<void>;
}

const BILLS: Category[] = ['fixed', 'variable'];

const TAG = {
  fixed: 'bg-amber-400/10 text-amber-300 ring-amber-400/20',
  variable: 'bg-sky-400/10 text-sky-300 ring-sky-400/20',
} as const;

export default function PaymentsView({ month, onMonthChange, entries, onTogglePaid }: Props) {
  const [autogiroOpen, setAutogiroOpen] = useState(true);
  const [cardOpen, setCardOpen] = useState(true);

  const { bills, autogiro, cards } = useMemo(() => {
    const costs = entries
      .filter((e) => e.month === month && BILLS.includes(e.category))
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name, 'sv'));
    return {
      bills: costs.filter((e) => e.payment_type === 'invoice'),
      autogiro: costs.filter((e) => e.payment_type === 'autogiro'),
      cards: costs.filter((e) => e.payment_type === 'card_pot'),
    };
  }, [entries, month]);

  const paidCount = bills.filter((e) => e.paid).length;
  const total = bills.length;
  const remaining = bills.filter((e) => !e.paid).reduce((a, e) => a + e.amount, 0);
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
                ? 'Endast poster med betaltyp Faktura visas här. Autogiro och kortköp räknas inte med.'
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
          <p>Inga fakturor att bocka av. Autogiro och kortköp visas nedan.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {bills.map((bill) => (
            <BillRow key={bill.id} bill={bill} onToggle={onTogglePaid} />
          ))}
        </ul>
      )}

      <ExcludedGroup
        title="Hanteras via Autogiro"
        hint="dras automatiskt"
        icon={<Repeat className="h-5 w-5" />}
        items={autogiro}
        open={autogiroOpen}
        onToggle={() => setAutogiroOpen((v) => !v)}
      />
      <ExcludedGroup
        title="Kortköp"
        hint="löpande kortutgifter"
        icon={<CreditCard className="h-5 w-5" />}
        items={cards}
        open={cardOpen}
        onToggle={() => setCardOpen((v) => !v)}
      />
    </div>
  );
}

function ExcludedGroup({
  title, hint, icon, items, open, onToggle,
}: {
  title: string;
  hint: string;
  icon: React.ReactNode;
  items: Entry[];
  open: boolean;
  onToggle: () => void;
}) {
  if (items.length === 0) return null;
  const total = items.reduce((a, e) => a + e.amount, 0);

  return (
    <section className="card overflow-hidden animate-fade-in">
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 p-5 text-left">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-slate-300">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold text-slate-100">{title}</h3>
          <p className="text-xs text-slate-500">
            {items.length} {items.length === 1 ? 'post' : 'poster'} · {formatKr(total)} {hint}
          </p>
        </div>
        <ChevronDown className={`h-5 w-5 text-slate-500 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="space-y-1 border-t border-white/5 px-3 pb-4 pt-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-300">{item.name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${TAG[item.category as 'fixed' | 'variable']}`}>
                    {CATEGORY_LABELS[item.category]}
                  </span>
                  <span className="inline-flex rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400 ring-1 ring-white/10">
                    {PAYMENT_TYPE_LABELS[item.payment_type]}
                  </span>
                </div>
              </div>
              <div className="stat-num shrink-0 text-sm text-slate-400">{formatKr(item.amount)}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
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
          {formatKr(bill.amount)}
        </div>
      </button>
    </li>
  );
}
