import { useMemo, useState } from 'react';
import { Check, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, CreditCard, Repeat } from 'lucide-react';
import { Category, CATEGORY_LABELS, Entry, PAYMENT_TYPE_LABELS, RECURRENCE_BADGE, isRecurrencePeriod } from '@/lib/types';
import { formatPercent, monthLabel, addMonths } from '@/lib/format';
import { isRecurrenceDue } from '@/lib/recurrence';
import { SensitiveKr } from '@/components/SensitiveKr';

interface Props {
  month: string;
  onMonthChange: (month: string) => void;
  entries: Entry[];
  onTogglePaid: (id: string, paid: boolean) => Promise<void>;
}

const COST_CATEGORIES: Category[] = ['fixed', 'variable'];

const TAG = {
  fixed: 'bg-amber-400/10 text-amber-200/90 ring-amber-400/15',
  variable: 'bg-sky-400/10 text-sky-200/90 ring-sky-400/15',
} as const;

function paymentAmount(entry: Entry): number {
  const n = Number(entry.amount);
  return Number.isFinite(n) ? n : 0;
}

function compareByCategoryAndName(a: Entry, b: Entry) {
  return a.category.localeCompare(b.category) || a.name.localeCompare(b.name, 'sv');
}

function compareChecklist(a: Entry, b: Entry) {
  const aPaid = Boolean(a.paid);
  const bPaid = Boolean(b.paid);
  if (aPaid !== bPaid) return aPaid ? 1 : -1;
  return compareByCategoryAndName(a, b);
}

function isPositiveCost(entry: Entry, month: string): boolean {
  return (
    entry.month === month &&
    COST_CATEGORIES.includes(entry.category) &&
    paymentAmount(entry) > 0 &&
    isRecurrenceDue(entry.recurrence, entry.recurrence_anchor, month)
  );
}

/** Main checklist: Faktura only, strictly positive amount. */
export function isBetalningarItem(entry: Entry, month: string): boolean {
  return isPositiveCost(entry, month) && entry.payment_type === 'invoice';
}

export default function PaymentsView({ month, onMonthChange, entries, onTogglePaid }: Props) {
  const [otherOpen, setOtherOpen] = useState(false);

  const { bills, unpaidBills, paidBills, autogiro, cards } = useMemo(() => {
    const bills = entries.filter((e) => isBetalningarItem(e, month)).sort(compareChecklist);
    return {
      bills,
      unpaidBills: bills.filter((e) => !e.paid),
      paidBills: bills.filter((e) => e.paid),
      autogiro: entries
        .filter((e) => isPositiveCost(e, month) && e.payment_type === 'autogiro')
        .sort(compareByCategoryAndName),
      cards: entries
        .filter((e) => isPositiveCost(e, month) && e.payment_type === 'card_pot')
        .sort(compareByCategoryAndName),
    };
  }, [entries, month]);

  const otherCount = autogiro.length + cards.length;
  const otherSum = [...autogiro, ...cards].reduce((a, e) => a + paymentAmount(e), 0);

  const paidCount = bills.filter((e) => e.paid).length;
  const total = bills.length;
  const remaining = bills.filter((e) => !e.paid).reduce((a, e) => a + paymentAmount(e), 0);
  const pct = total === 0 ? 0 : Math.round((paidCount / total) * 100);

  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 animate-fade-in">
        <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(month, -1))}
            className="icon-btn"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 text-center sm:min-w-[11rem] sm:flex-none">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-300">Betalningar</div>
            <div className="font-display text-lg font-bold capitalize text-zinc-50">{monthLabel(month)}</div>
          </div>
          <button
            type="button"
            onClick={() => onMonthChange(addMonths(month, 1))}
            className="icon-btn"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </header>

      <section className="card p-5 sm:p-6 animate-slide-up">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-400/10 text-teal-300">
            <CheckSquare className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold text-zinc-50">
              {total === 0
                ? 'Inga fakturor att betala manuellt'
                : `${paidCount} av ${total} räkningar betalda (${formatPercent(pct)})`}
            </h2>
            <p className="mt-1 text-sm text-zinc-300">
              {total === 0
                ? 'Endast fakturor över 0 kr räknas i checklistan. Autogiro och kortköp ligger i en egen lista under.'
                : <>Kvar att betala: <b className="text-zinc-100"><SensitiveKr value={remaining} /></b></>}
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-teal-400/80 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {bills.length === 0 ? (
        <div className="card grid place-items-center p-12 text-center text-zinc-300">
          <CheckSquare className="mb-3 h-10 w-10 opacity-40" />
          <p>Inga fakturor över 0 kr att bocka av.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {unpaidBills.map((bill) => (
            <BillRow key={bill.id} bill={bill} onToggle={onTogglePaid} />
          ))}
          {paidBills.length > 0 && unpaidBills.length > 0 && (
            <li className="list-none px-1 pt-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-300">
              Betalda
            </li>
          )}
          {paidBills.map((bill) => (
            <BillRow key={bill.id} bill={bill} onToggle={onTogglePaid} />
          ))}
        </ul>
      )}

      {otherCount > 0 && (
        <section className="card overflow-hidden animate-fade-in">
          <button
            type="button"
            aria-expanded={otherOpen}
            onClick={() => setOtherOpen((v) => !v)}
            className="flex w-full items-center gap-3 p-5 text-left transition-all duration-200 hover:bg-white/[0.02]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-zinc-300">
              <Repeat className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display font-semibold text-zinc-50">
                {otherOpen ? 'Dölj Autogiro & Kortköp' : 'Visa Autogiro & Kortköp'}
              </h3>
              <p className="text-xs text-zinc-300">
                {otherCount} {otherCount === 1 ? 'post' : 'poster'} · <SensitiveKr value={otherSum} /> · ingår inte i checklistan
              </p>
            </div>
            <ChevronDown className={`h-5 w-5 text-zinc-400 transition ${otherOpen ? 'rotate-180' : ''}`} />
          </button>
          {otherOpen && (
            <div className="border-t border-white/5 px-3 pb-4 pt-2">
              <OtherTypeList
                title="Hanteras via Autogiro"
                hint="dras automatiskt"
                icon={<Repeat className="h-4 w-4" />}
                items={autogiro}
              />
              <OtherTypeList
                title="Kortköp"
                hint="löpande kortutgifter"
                icon={<CreditCard className="h-4 w-4" />}
                items={cards}
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function OtherTypeList({
  title,
  hint,
  icon,
  items,
}: {
  title: string;
  hint: string;
  icon: React.ReactNode;
  items: Entry[];
}) {
  if (items.length === 0) return null;
  const total = items.reduce((a, e) => a + paymentAmount(e), 0);

  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center gap-2 px-2 py-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-zinc-300">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-zinc-50">{title}</h4>
          <p className="text-[11px] text-zinc-300">
            {items.length} {items.length === 1 ? 'post' : 'poster'} · <SensitiveKr value={total} /> · {hint}
          </p>
        </div>
      </div>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="font-medium text-zinc-100">{item.name}</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${TAG[item.category as 'fixed' | 'variable']}`}>
                  {CATEGORY_LABELS[item.category]}
                </span>
                <span className="inline-flex rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-300 ring-1 ring-white/10">
                  {PAYMENT_TYPE_LABELS[item.payment_type]}
                </span>
                {isRecurrencePeriod(item.recurrence) && (
                  <span className="inline-flex rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-200 ring-1 ring-amber-400/20">
                    {RECURRENCE_BADGE[item.recurrence]}
                  </span>
                )}
              </div>
            </div>
            <div className="stat-num shrink-0 text-sm text-zinc-100"><SensitiveKr value={paymentAmount(item)} /></div>
          </li>
        ))}
      </ul>
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
    <li className="transition-all duration-300 ease-out">
      <button
        type="button"
        onClick={() => onToggle(bill.id, !paid)}
        className={`card flex w-full min-w-0 items-center gap-3 p-5 text-left transition-all duration-200 ${
          paid ? 'opacity-60' : 'hover:border-white/10 hover:bg-white/[0.02]'
        }`}
      >
        <span
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-all duration-200 ${
            paid
              ? 'border-teal-400/40 bg-teal-400/90 text-teal-950'
              : 'border-white/15 bg-black/20'
          }`}
        >
          {paid && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className={`font-medium truncate ${paid ? 'text-zinc-400 line-through' : 'text-zinc-50'}`}>
            {bill.name}
          </div>
          <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${tagClass}`}>
            {CATEGORY_LABELS[bill.category]}
          </span>
          {isRecurrencePeriod(bill.recurrence) && (
            <span className="ml-1 inline-flex rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-200 ring-1 ring-amber-400/20">
              {RECURRENCE_BADGE[bill.recurrence]}
            </span>
          )}
        </div>
        <div className={`stat-num shrink-0 text-base ${paid ? 'text-zinc-400 line-through' : 'text-zinc-50'}`}>
          <SensitiveKr value={paymentAmount(bill)} />
        </div>
      </button>
    </li>
  );
}
