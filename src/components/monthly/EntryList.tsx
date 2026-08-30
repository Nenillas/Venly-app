import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { CalendarClock, Plus, Trash2, Check, Repeat, CreditCard, ChevronDown, FileText, X } from 'lucide-react';
import { Category, CATEGORY_LABELS, Entry, isCarryInIncome, CARRY_IN_INCOME_HELP, CARRY_IN_INCOME_NAME, canonicalItemName, isExpense, isRecurrencePeriod, PAYMENT_TYPE_LABELS, PAYMENT_TYPES, PaymentMenuValue, PaymentType, RECURRENCE_BADGE, RECURRENCE_LABELS, RECURRENCE_PERIODS, RecurrencePeriod, SAVINGS_BUCKET_HELP } from '@/lib/types';
import InfoTip from '@/components/InfoTip';
import { isRecurrenceDue } from '@/lib/recurrence';
import { SensitiveKr } from '@/components/SensitiveKr';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

interface Props {
  title: string;
  hint: string;
  accent: 'emerald' | 'sky' | 'amber' | 'violet';
  icon: React.ReactNode;
  category: Category;
  month: string;
  entries: Entry[];
  total: number;
  onAdd: (month: string, category: Category, name: string, amount: number) => Promise<void>;
  onUpdate: (id: string, patch: Partial<Pick<Entry, 'name' | 'amount' | 'paid' | 'payment_type' | 'recurrence' | 'recurrence_anchor'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const ACCENTS = {
  emerald: { text: 'text-teal-300', dot: 'bg-teal-400/80', ring: 'focus:border-teal-400/50' },
  sky: { text: 'text-sky-300', dot: 'bg-sky-400/80', ring: 'focus:border-sky-400/50' },
  amber: { text: 'text-amber-300', dot: 'bg-amber-400/80', ring: 'focus:border-amber-400/50' },
  violet: { text: 'text-teal-200', dot: 'bg-teal-300/80', ring: 'focus:border-teal-300/50' },
};

export default function EntryList({
  title, hint, accent, icon, category, month, entries, total,
  onAdd, onUpdate, onDelete,
}: Props) {
  const a = ACCENTS[accent];
  const [busy, setBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Entry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const defaultName =
    category === 'income' ? 'Ny inkomst' :
    category === 'savings' ? 'Nytt sparande' : 'Ny kostnad';
  const addLabel =
    category === 'income' ? 'Lägg till inkomst' :
    category === 'savings' ? 'Lägg till sparande' : 'Lägg till utgift';

  const handleAdd = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    setAddError(null);
    setBusy(true);
    try {
      await onAdd(month, category, defaultName, 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(message, err);
      setAddError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card relative z-[1] min-w-0 overflow-x-auto p-5 sm:p-6 animate-fade-in">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 ${a.text}`}>
            {icon}
          </span>
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 font-display text-base font-semibold text-zinc-50">
              <span>{title}</span>
              {category === 'savings' && (
                <InfoTip label="Vad är målinriktat sparande?" className="w-80">
                  <p className="mb-2 font-medium text-zinc-50">Så kan du tänka kring dina sparanderader:</p>
                  <ul className="space-y-2">
                    {SAVINGS_BUCKET_HELP.map((item) => (
                      <li key={item.title}>
                        <span className="font-semibold text-teal-200">{item.title}:</span>{' '}
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </InfoTip>
              )}
            </h3>
            <p className="text-xs text-zinc-300">{hint}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`stat-num text-lg ${a.text}`}><SensitiveKr value={total} /></div>
          <div className="text-[11px] font-medium text-zinc-300">totalt</div>
        </div>
      </div>

      <div className="space-y-1.5">
        {entries.length === 0 && (
          <p className="py-3 text-center text-sm text-zinc-300">Inga poster ännu.</p>
        )}
        {entries.map((e) => (
          <Row key={e.id} entry={e} accentRing={a.ring} dot={a.dot}
            onUpdate={onUpdate} onRequestDelete={() => setPendingDelete(e)} />
        ))}
      </div>

      <form onSubmit={handleAdd}>
        <button
          type="submit"
          className="relative z-[1] mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 py-2.5 text-sm font-medium text-zinc-300 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.03] hover:text-zinc-50"
        >
          <Plus className="h-4 w-4" /> {busy ? 'Lägger till…' : addLabel}
        </button>
      </form>
      {addError && (
        <p className="mt-2 text-center text-xs text-rose-300">{addError}</p>
      )}
      {pendingDelete && (
        <DeleteConfirmDialog
          entry={pendingDelete}
          busy={deleting}
          onCancel={() => { if (!deleting) setPendingDelete(null); }}
          onConfirm={async () => {
            setDeleting(true);
            try {
              await onDelete(pendingDelete.id);
              setPendingDelete(null);
            } catch (err) {
              console.error(err instanceof Error ? err.message : err, err);
            } finally {
              setDeleting(false);
            }
          }}
        />
      )}
    </section>
  );
}

function Row({
  entry, accentRing, dot, onUpdate, onRequestDelete,
}: {
  entry: Entry;
  accentRing: string;
  dot: string;
  onUpdate: Props['onUpdate'];
  onRequestDelete: () => void;
}) {
  const [name, setName] = useState(entry.name);
  const [amount, setAmount] = useState(String(entry.amount));
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const focused = useRef(false);

  useEffect(() => {
    if (focused.current) return;
    setName(entry.name);
    setAmount(String(entry.amount));
  }, [entry.id, entry.name, entry.amount]);

  const commitName = () => {
    const v = canonicalItemName(entry.category, name.trim() || 'Namnlös');
    if (v !== name.trim()) setName(v);
    if (v !== entry.name) {
      void onUpdate(entry.id, { name: v }).catch((err) => {
        console.error(err instanceof Error ? err.message : err, err);
      });
    }
  };
  const commitAmount = () => {
    const v = Math.max(0, Math.round(Number(String(amount).replace(',', '.')) || 0));
    if (v !== entry.amount) {
      void onUpdate(entry.id, { amount: v }).catch((err) => {
        console.error(err instanceof Error ? err.message : err, err);
      });
    }
    setAmount(String(v));
  };

  const showType = isExpense(entry.category);
  const carryIn = isCarryInIncome(entry);
  const periodic = isRecurrencePeriod(entry.recurrence) ? entry.recurrence : null;
  const due = isRecurrenceDue(entry.recurrence, entry.recurrence_anchor, entry.month);
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const menuValue: PaymentMenuValue = periodic ?? entry.payment_type;

  return (
    <div
      className={`group relative flex min-w-0 flex-wrap items-center gap-2 rounded-xl px-1 py-1.5 transition-all duration-200 hover:bg-white/[0.04] sm:flex-nowrap sm:px-2 ${
        typeMenuOpen ? 'z-20' : 'z-0 hover:z-10'
      } ${periodic && !due ? 'opacity-45' : ''}`}
    >
      {showType && entry.paid && entry.payment_type === 'invoice' ? (
        <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-teal-400/90 text-teal-950 transition-all duration-200" title="Betald" aria-label="Betald">
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
      ) : (
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      )}
      {carryIn ? (
        <div className="relative z-[1] flex min-w-0 flex-1 items-center gap-1 px-2 py-1">
          <span className="truncate text-sm text-zinc-50">{CARRY_IN_INCOME_NAME}</span>
          <InfoTip label="Vad är ingående balans?" className="w-64">
            {CARRY_IN_INCOME_HELP}
          </InfoTip>
        </div>
      ) : (
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onFocus={() => { focused.current = true; }}
        onBlur={() => { focused.current = false; commitName(); }}
        className={`relative z-[1] min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-zinc-50 outline-none transition-all duration-200 ${accentRing} focus:bg-white/[0.04]`}
      />
      )}
      {periodic && (
        <span
          className="shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200 ring-1 ring-amber-400/20"
          title={due ? RECURRENCE_LABELS[periodic] : 'Planerad — inte denna månad'}
        >
          {RECURRENCE_BADGE[periodic]}
          {!due ? ' · senare' : ''}
        </span>
      )}
      {showType && (
        <PaymentTypePicker
          value={menuValue}
          onOpenChange={setTypeMenuOpen}
          onChange={(value) => {
            if (isRecurrencePeriod(value)) {
              void onUpdate(entry.id, {
                recurrence: value,
                recurrence_anchor: entry.recurrence_anchor || entry.month,
              }).catch((err) => {
                console.error(err instanceof Error ? err.message : err, err);
              });
              return;
            }
            void onUpdate(entry.id, {
              payment_type: value,
              recurrence: 'none',
              recurrence_anchor: null,
            }).catch((err) => {
              console.error(err instanceof Error ? err.message : err, err);
            });
          }}
        />
      )}
      <div className="flex shrink-0 items-center gap-1">
        <input
          type="text"
          inputMode="numeric"
          value={isPrivacyModeEnabled ? '••••' : amount}
          onChange={(e) => { if (!carryIn && !isPrivacyModeEnabled) setAmount(e.target.value); }}
          onFocus={() => { if (!carryIn && !isPrivacyModeEnabled) focused.current = true; }}
          onBlur={() => { if (!carryIn && !isPrivacyModeEnabled) { focused.current = false; commitAmount(); } }}
          className={`relative z-[1] w-[4.5rem] rounded-lg border border-white/[0.08] bg-black/15 px-2 py-1 text-right text-sm tabular-nums text-zinc-50 outline-none transition-all duration-200 sm:w-24 ${accentRing} ${
            carryIn ? 'cursor-default text-zinc-200' : ''
          } ${isPrivacyModeEnabled ? 'blur-sm select-none' : ''}`}
          readOnly={carryIn || isPrivacyModeEnabled}
        />
        <span className="pointer-events-none text-xs text-zinc-300">kr</span>
      </div>
      <button
        type="button"
        onClick={onRequestDelete}
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-zinc-400 transition-all duration-200 hover:bg-rose-400/10 hover:text-rose-300 ${
          carryIn ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
        }`}
        aria-label="Ta bort"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function DeleteConfirmDialog({
  entry,
  busy,
  onCancel,
  onConfirm,
}: {
  entry: Entry;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const label = entry.name.trim() || CATEGORY_LABELS[entry.category];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="delete-row-title" aria-describedby="delete-row-desc">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => { if (!busy) onCancel(); }} />
      <div className="relative w-full max-w-md card p-6 animate-scale-in">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-zinc-300 hover:bg-white/5 hover:text-zinc-50 disabled:opacity-50"
          aria-label="Avbryt"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-start gap-3 pr-8">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-400/10 text-rose-300">
            <Trash2 className="h-5 w-5" />
          </span>
          <div>
            <h2 id="delete-row-title" className="font-display text-xl font-bold text-zinc-50">Ta bort rad?</h2>
            <p id="delete-row-desc" className="mt-2 text-sm leading-relaxed text-zinc-300">
              Är du säker på att du vill ta bort <span className="font-medium text-zinc-50">{label}</span>? Denna åtgärd går inte att ångra.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="btn-secondary"
          >
            Avbryt
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="btn-danger"
          >
            {busy ? 'Tar bort…' : 'Ta bort'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const TYPE_STYLE: Record<PaymentType, { btn: string; icon: typeof FileText }> = {
  invoice: { btn: 'bg-slate-100 text-slate-800 hover:bg-white', icon: FileText },
  autogiro: { btn: 'bg-sky-100 text-sky-900 hover:bg-sky-50', icon: Repeat },
  card_pot: { btn: 'bg-violet-100 text-violet-900 hover:bg-violet-50', icon: CreditCard },
};

const RECURRENCE_STYLE: Record<RecurrencePeriod, { btn: string; icon: typeof CalendarClock }> = {
  quarterly: { btn: 'bg-amber-100 text-amber-950 hover:bg-amber-50', icon: CalendarClock },
  semiannual: { btn: 'bg-teal-100 text-teal-950 hover:bg-teal-50', icon: CalendarClock },
  annual: { btn: 'bg-indigo-100 text-indigo-950 hover:bg-indigo-50', icon: CalendarClock },
};

function PaymentTypePicker({
  value,
  onChange,
  onOpenChange,
}: {
  value: PaymentMenuValue;
  onChange: (type: PaymentMenuValue) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const style = isRecurrencePeriod(value) ? RECURRENCE_STYLE[value] : TYPE_STYLE[value];
  const Icon = style.icon;
  const triggerLabel = isRecurrencePeriod(value) ? RECURRENCE_BADGE[value] : PAYMENT_TYPE_LABELS[value];

  const setMenuOpen = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const trigger = box.current?.querySelector('button');
      if (!trigger) return;
      const r = trigger.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (box.current?.contains(target) || menu.current?.contains(target)) return;
      setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={box} className="relative z-20 shrink-0">
      <button
        type="button"
        aria-label="Betaltyp"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setMenuPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
          setMenuOpen(!open);
        }}
        className={`flex items-center gap-1 rounded-full px-1.5 py-1 text-[11px] font-semibold transition sm:px-2 ${style.btn}`}
      >
        <Icon className="h-3 w-3 shrink-0" />
        <span className="hidden sm:inline">{triggerLabel}</span>
        <ChevronDown className={`h-3 w-3 opacity-70 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open &&
        createPortal(
          <ul
            ref={menu}
            role="listbox"
            style={{ top: menuPos.top, right: menuPos.right }}
            className="fixed z-50 min-w-[14rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-black/30"
          >
            {PAYMENT_TYPES.map((type) => {
              const OptionIcon = TYPE_STYLE[type].icon;
              const selected = type === value;
              return (
                <li key={type}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(type);
                      setMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                      selected
                        ? 'bg-emerald-50 font-semibold text-emerald-900'
                        : 'text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <OptionIcon className="h-4 w-4 shrink-0 opacity-80" />
                    {PAYMENT_TYPE_LABELS[type]}
                  </button>
                </li>
              );
            })}
            <li className="my-1 border-t border-slate-200" role="separator" />
            {RECURRENCE_PERIODS.map((period) => {
              const OptionIcon = RECURRENCE_STYLE[period].icon;
              const selected = period === value;
              return (
                <li key={period}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(period);
                      setMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                      selected
                        ? 'bg-amber-50 font-semibold text-amber-950'
                        : 'text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <OptionIcon className="h-4 w-4 shrink-0 opacity-80" />
                    {RECURRENCE_LABELS[period]}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}
