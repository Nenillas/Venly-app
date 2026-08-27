import { useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Wallet, Building2, ShoppingBag,
  Target, TrendingUp, TrendingDown, PiggyBank, Lightbulb, Check, X,
  Copy,
} from 'lucide-react';
import { Category, Entry, MonthMeta, SAVINGS_BUCKETS } from '@/lib/types';
import { amountToBoostSavings, splitProportionally, totalsFor } from '@/lib/calculations';
import { formatKr, monthLabel, addMonths } from '@/lib/format';
import { dockSurplusSection, readDockedUntil } from '@/lib/surplusPlacement';
import EntryList from './EntryList';
import SurplusModal from './SurplusModal';
import PayrollSurplusSection from './PayrollSurplusSection';

interface Props {
  month: string;
  onMonthChange: (month: string) => void;
  entries: Entry[];
  getMeta: (month: string) => MonthMeta;
  onAdd: (month: string, category: Category, name: string, amount: number) => Promise<void>;
  onUpdate: (id: string, patch: Partial<Pick<Entry, 'name' | 'amount' | 'paid' | 'payment_type'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCopyMonth: (fromMonth: string, toMonth: string) => Promise<void>;
  onUpdateMeta: (month: string, patch: Partial<Omit<MonthMeta, 'id' | 'month'>>) => Promise<void>;
}

export default function MonthlyView({
  month, onMonthChange, entries, getMeta, onAdd, onUpdate, onDelete, onCopyMonth, onUpdateMeta,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSurplus, setModalSurplus] = useState(0);
  const [copying, setCopying] = useState(false);
  const monthEntries = useMemo(
    () => entries.filter((e) => e.month === month),
    [entries, month],
  );
  const meta = getMeta(month);
  const totals = useMemo(() => totalsFor(monthEntries), [monthEntries]);
  const [surplusNotice, setSurplusNotice] = useState<'idle' | 'applied' | 'dismissed'>('idle');
  const [appliedAmount, setAppliedAmount] = useState(0);
  const [dockedUntil, setDockedUntil] = useState(readDockedUntil);
  const surplusAtTop = Date.now() >= dockedUntil;

  const previousMonthWithData = useMemo(() => {
    const earlier = Array.from(new Set(entries.map((e) => e.month)))
      .filter((m) => m < month)
      .sort();
    return earlier.at(-1) ?? null;
  }, [entries, month]);

  const byCat = (c: Category) => monthEntries.filter((e) => e.category === c);
  const sum = (c: Category) => byCat(c).reduce((a, e) => a + e.amount, 0);

  const savingsRows = byCat('savings');
  const boostAmount = amountToBoostSavings(totals);
  const showSuggestion = surplusNotice === 'idle' && boostAmount > 0 && savingsRows.length > 0;
  const showApplied = surplusNotice === 'applied';
  const showCopyPrompt = monthEntries.length === 0 && previousMonthWithData !== null;

  const distributeExcessSurplus = async () => {
    if (savingsRows.length === 0 || boostAmount <= 0) return;
    const amount = boostAmount;
    const parts = splitProportionally(amount, savingsRows.map((row) => row.amount));
    for (let i = 0; i < savingsRows.length; i++) {
      const addition = parts[i];
      if (addition > 0) {
        await onUpdate(savingsRows[i].id, { amount: savingsRows[i].amount + addition });
      }
    }
    setAppliedAmount(amount);
    setSurplusNotice('applied');
  };

  const copyPrevious = async () => {
    if (!previousMonthWithData) return;
    setCopying(true);
    try {
      await onCopyMonth(previousMonthWithData, month);
    } finally {
      setCopying(false);
    }
  };

  const applySurplus = async (amounts: { buffer: number; avanza: number; travel: number }) => {
    const savings = monthEntries
      .filter((e) => e.category === 'savings')
      .map((e) => ({ ...e }));

    for (const { key, name, match } of SAVINGS_BUCKETS) {
      const amt = amounts[key];
      if (amt <= 0) continue;
      const existing = savings.find((e) => match.test(e.name));
      if (existing) {
        const next = Number(existing.amount) + amt;
        existing.amount = next;
        await onUpdate(existing.id, { amount: next });
      } else {
        await onAdd(month, 'savings', name, amt);
      }
    }
    await onUpdateMeta(month, { ending_balance: 0 });
    setDockedUntil(dockSurplusSection());
  };

  const openSurplusModal = () => {
    const v = Math.max(0, Math.round(Number(meta.ending_balance) || 0));
    setModalSurplus(v);
    setModalOpen(true);
  };

  const stats = [
    { label: 'Inkomster', value: totals.income, icon: Wallet, color: 'text-emerald-400', ring: 'ring-emerald-400/20' },
    { label: 'Kostnader', value: totals.expenses, icon: ShoppingBag, color: 'text-rose-400', ring: 'ring-rose-400/20' },
    { label: 'Sparande', value: totals.savings, icon: PiggyBank, color: 'text-sky-400', ring: 'ring-sky-400/20' },
  ];

  return (
    <div className="space-y-6">
      <header className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setSurplusNotice('idle'); onMonthChange(addMonths(month, -1)); }}
            className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-white/10">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-[11rem] text-center">
            <div className="text-xs uppercase tracking-wide text-slate-500">Månadsöversikt</div>
            <div className="font-display text-lg font-bold capitalize text-slate-50">{monthLabel(month)}</div>
          </div>
          <button
            type="button"
            onClick={() => { setSurplusNotice('idle'); onMonthChange(addMonths(month, 1)); }}
            className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-slate-300 transition hover:bg-white/10">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 ring-1 ${totals.net >= 0 ? 'bg-emerald-400/5 ring-emerald-400/20' : 'bg-rose-400/5 ring-rose-400/20'}`}>
          {totals.net >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-400" /> : <TrendingDown className="h-5 w-5 text-rose-400" />}
          <div>
            <div className="text-xs text-slate-500">Nettoresultat</div>
            <div className={`stat-num text-lg ${totals.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatKr(totals.net)}</div>
            <div className="text-[11px] text-slate-600">exkl. saldo på lönekontot</div>
          </div>
        </div>
      </header>

      {surplusAtTop && (
        <PayrollSurplusSection
          meta={meta}
          onCommitBalance={(v) => {
            void onUpdateMeta(month, { ending_balance: v }).catch((err) => {
              console.error(err instanceof Error ? err.message : err, err);
            });
          }}
          onOpenModal={openSurplusModal}
        />
      )}

      {showCopyPrompt && (
        <section className="card relative overflow-hidden border-emerald-400/20 p-5 animate-slide-up">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-400/10 text-emerald-400">
              <Copy className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <h3 className="font-display font-semibold text-emerald-300">Starta 2-minutersrutinen</h3>
              <p className="mt-1 text-sm text-slate-400">
                {monthLabel(month)} är tom. Kopiera poster och sparfördelning från{' '}
                <b className="text-slate-200">{monthLabel(previousMonthWithData!)}</b> och justera bara det som ändrats.
              </p>
              <button
                onClick={copyPrevious}
                disabled={copying}
                className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
              >
                <Copy className="h-4 w-4" /> {copying ? 'Kopierar…' : `Kopiera från ${monthLabel(previousMonthWithData!)}`}
              </button>
            </div>
          </div>
        </section>
      )}

      {(showSuggestion || showApplied) && (
        <section className="card relative overflow-hidden border-sky-400/20 p-5 animate-slide-up">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sky-400/10 blur-2xl" />
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-400/10 text-sky-400">
              {showApplied ? <Check className="h-5 w-5" /> : <Lightbulb className="h-5 w-5" />}
            </span>
            <div className="flex-1">
              {showApplied ? (
                <>
                  <h3 className="font-display font-semibold text-emerald-400">Överskott fördelat!</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {formatKr(appliedAmount)} har lagts till på dina sparanderader proportionellt.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="font-display font-semibold text-sky-300">Förslag: Öka ditt sparande</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Ditt nettoresultat överstiger 10% av inkomsten. {formatKr(boostAmount)} kan flyttas till sparande
                    utan att netto går under 10% eller blir negativt.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={distributeExcessSurplus}
                      className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 transition hover:bg-sky-400"
                    >
                      <PiggyBank className="h-4 w-4" /> Fördela {formatKr(boostAmount)}
                    </button>
                    <button
                      onClick={() => setSurplusNotice('dismissed')}
                      className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 transition hover:text-slate-200"
                    >
                      <X className="h-4 w-4" /> Inte nu
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className={`card flex items-center gap-4 p-4 ring-1 ${s.ring} animate-fade-in`}>
            <span className={`grid h-11 w-11 place-items-center rounded-xl bg-white/5 ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </span>
            <div>
              <div className="text-xs text-slate-500">{s.label}</div>
              <div className={`stat-num text-xl ${s.color}`}>{formatKr(s.value)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <EntryList title="Inkomster" hint="Lön, sidoinkomster m.m." accent="emerald"
          icon={<Wallet className="h-5 w-5" />} category="income" month={month}
          entries={byCat('income')} total={sum('income')} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} />
        <EntryList title="Fasta kostnader" hint="Hyra, abonnemang, lån" accent="amber"
          icon={<Building2 className="h-5 w-5" />} category="fixed" month={month}
          entries={byCat('fixed')} total={sum('fixed')} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} />
        <EntryList title="Rörliga kostnader" hint="Mat, shopping, nöje" accent="sky"
          icon={<ShoppingBag className="h-5 w-5" />} category="variable" month={month}
          entries={byCat('variable')} total={sum('variable')} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} />
        <EntryList title="Målinriktat sparande" hint="Avanza, buffert, resekonto" accent="violet"
          icon={<Target className="h-5 w-5" />} category="savings" month={month}
          entries={byCat('savings')} total={sum('savings')} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} />
      </div>

      {!surplusAtTop && (
        <PayrollSurplusSection
          meta={meta}
          onCommitBalance={(v) => {
            void onUpdateMeta(month, { ending_balance: v }).catch((err) => {
              console.error(err instanceof Error ? err.message : err, err);
            });
          }}
          onOpenModal={openSurplusModal}
        />
      )}

      {modalOpen && (
        <SurplusModal
          meta={meta}
          totals={totals}
          surplus={modalSurplus}
          onClose={() => setModalOpen(false)}
          onSaveRules={(patch) => onUpdateMeta(month, patch)}
          onApply={applySurplus}
        />
      )}
    </div>
  );
}
