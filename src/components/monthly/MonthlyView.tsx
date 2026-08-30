import { useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Wallet, Building2, ShoppingBag,
  Target, TrendingUp, TrendingDown, PiggyBank, Lightbulb, Check, X,
  Copy,
} from 'lucide-react';
import { Category, Entry, MonthMeta, isCarryInIncome, CARRY_IN_INCOME_NAME, resolveSavingsTargets } from '@/lib/types';
import { amountToBoostSavings, deficitSavingsCuts, splitProportionally, totalsFor } from '@/lib/calculations';
import { dailyAllowance, DEFAULT_PAYDAY_DATE, nextPaydayDate, remainingDaysUntilPayday, remainingDisposableAmount, type PaydayDate } from '@/lib/payday';
import { monthLabel, addMonths } from '@/lib/format';
import { entryAmountForMonth } from '@/lib/recurrence';
import { SensitiveKr, sensitiveKrText } from '@/components/SensitiveKr';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { dockSurplusSection, readDockedUntil } from '@/lib/surplusPlacement';
import EntryList from './EntryList';
import SurplusModal, { type SurplusAllocation } from './SurplusModal';
import PayrollSurplusSection from './PayrollSurplusSection';
import DailyAllowanceBadge from './DailyAllowanceBadge';

interface Props {
  month: string;
  onMonthChange: (month: string) => void;
  entries: Entry[];
  getMeta: (month: string) => MonthMeta;
  onAdd: (month: string, category: Category, name: string, amount: number) => Promise<void>;
  onUpdate: (id: string, patch: Partial<Pick<Entry, 'name' | 'amount' | 'paid' | 'payment_type' | 'recurrence' | 'recurrence_anchor'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCopyMonth: (fromMonth: string, toMonth: string) => Promise<void>;
  onUpdateMeta: (month: string, patch: Partial<Omit<MonthMeta, 'id' | 'month'>>) => Promise<void>;
  paydayDate?: PaydayDate;
  rolloverBusy?: boolean;
}

export default function MonthlyView({
  month, onMonthChange, entries, getMeta, onAdd, onUpdate, onDelete, onCopyMonth, onUpdateMeta,
  paydayDate = DEFAULT_PAYDAY_DATE,
  rolloverBusy = false,
}: Props) {
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSurplus, setModalSurplus] = useState(0);
  const [copying, setCopying] = useState(false);
  const monthEntries = useMemo(
    () => entries.filter((e) => e.month === month),
    [entries, month],
  );
  const meta = getMeta(month);
  const totals = useMemo(() => totalsFor(monthEntries), [monthEntries]);
  const [surplusNotice, setSurplusNotice] = useState<'idle' | 'applied' | 'cut' | 'dismissed'>('idle');
  const [appliedAmount, setAppliedAmount] = useState(0);
  const [appliedLabels, setAppliedLabels] = useState('');
  const [dockedUntil, setDockedUntil] = useState(readDockedUntil);
  const surplusAtTop = Date.now() >= dockedUntil;

  const previousMonthWithData = useMemo(() => {
    const earlier = Array.from(new Set(entries.map((e) => e.month)))
      .filter((m) => m < month)
      .sort();
    return earlier.at(-1) ?? null;
  }, [entries, month]);

  const byCat = (c: Category) => monthEntries.filter((e) => e.category === c);
  const sum = (c: Category) => byCat(c).reduce((a, e) => a + entryAmountForMonth(e), 0);

  const incomeEntries = useMemo(() => {
    const rows = monthEntries.filter((e) => e.category === 'income');
    return [...rows].sort((a, b) => Number(isCarryInIncome(b)) - Number(isCarryInIncome(a)));
  }, [monthEntries]);

  const savingsRows = useMemo(
    () => monthEntries.filter((e) => e.category === 'savings'),
    [monthEntries],
  );
  const boostAmount = amountToBoostSavings(totals);
  const deficitCuts = useMemo(() => deficitSavingsCuts(totals.net, savingsRows), [totals.net, savingsRows]);
  const deficitTotal = deficitCuts.reduce((a, c) => a + c.reduce, 0);
  const showSuggestion = surplusNotice === 'idle' && boostAmount > 0 && savingsRows.length > 0;
  const showDeficit = surplusNotice === 'idle' && totals.net < 0 && deficitCuts.length > 0;
  const showApplied = surplusNotice === 'applied' || surplusNotice === 'cut';
  const showCopyPrompt = !rolloverBusy && monthEntries.length === 0 && previousMonthWithData !== null;

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
    setAppliedLabels(savingsRows.map((r) => r.name.trim()).filter(Boolean).join(', '));
    setSurplusNotice('applied');
  };

  const applyDeficitCuts = async () => {
    if (deficitCuts.length === 0) return;
    for (const cut of deficitCuts) {
      const row = savingsRows.find((e) => e.id === cut.id);
      if (!row || cut.reduce <= 0) continue;
      await onUpdate(row.id, { amount: Math.max(0, row.amount - cut.reduce) });
    }
    setAppliedAmount(deficitTotal);
    setAppliedLabels(deficitCuts.map((c) => c.name).join(', '));
    setSurplusNotice('cut');
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

  const applySurplus = async (allocations: SurplusAllocation[], leftover: number) => {
    const savings = monthEntries
      .filter((e) => e.category === 'savings')
      .map((e) => ({ ...e }));

    for (const item of allocations) {
      if (item.amount <= 0) continue;
      const existing =
        (item.id && savings.find((e) => e.id === item.id)) ||
        savings.find((e) => e.name.trim().toLowerCase() === item.name.trim().toLowerCase());
      if (existing) {
        const next = Number(existing.amount) + item.amount;
        existing.amount = next;
        await onUpdate(existing.id, { amount: next });
      } else {
        await onAdd(month, 'savings', item.name, item.amount);
      }
    }
    const allocated = allocations.reduce((a, x) => a + Math.max(0, x.amount), 0);
    if (allocated > 0) {
      const existing = monthEntries.find((e) => isCarryInIncome(e));
      if (existing) {
        await onUpdate(existing.id, { amount: existing.amount + allocated });
      } else {
        await onAdd(month, 'income', CARRY_IN_INCOME_NAME, allocated);
      }
    }
    await onUpdateMeta(month, {
      ending_balance: Math.max(0, Math.round(leftover)),
      carried_over_balance: (Number(meta.carried_over_balance) || 0) + allocated,
    });
    setDockedUntil(dockSurplusSection());
  };

  const openSurplusModal = () => {
    const v = Math.max(0, Math.round(Number(meta.ending_balance) || 0));
    setModalSurplus(v);
    setModalOpen(true);
  };

  const stats = [
    { label: 'Inkomster totalt', value: totals.income, icon: Wallet, color: 'text-teal-200', ring: 'ring-teal-400/15' },
    { label: 'Utgifter totalt', value: totals.expenses, icon: ShoppingBag, color: 'text-rose-200', ring: 'ring-rose-300/15' },
    { label: 'Sparande totalt', value: totals.savings, icon: PiggyBank, color: 'text-sky-200', ring: 'ring-sky-400/15' },
  ];

  const disposable = remainingDisposableAmount(totals);
  const payday = nextPaydayDate(new Date(), paydayDate);
  const remainingDays = remainingDaysUntilPayday(new Date(), paydayDate);
  const dailyAmount = dailyAllowance(disposable, remainingDays);

  return (
    <div className="w-full min-w-0 space-y-6">
      <header className="card flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between sm:p-6 animate-fade-in">
        <div className="flex w-full min-w-0 items-center gap-2 lg:w-auto">
          <button
            type="button"
            onClick={() => { setSurplusNotice('idle'); onMonthChange(addMonths(month, -1)); }}
            className="icon-btn">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 text-center sm:min-w-[11rem] sm:flex-none">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-300">Månadsöversikt</div>
            <div className="font-display text-lg font-bold capitalize text-zinc-50">{monthLabel(month)}</div>
          </div>
          <button
            type="button"
            onClick={() => { setSurplusNotice('idle'); onMonthChange(addMonths(month, 1)); }}
            className="icon-btn">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:items-stretch lg:w-auto">
          <div className={`flex min-w-0 flex-1 items-center gap-3 px-5 py-3.5 sm:min-w-[12rem] ${totals.net >= 0 ? 'metric-positive' : 'metric-negative'}`}>
            {totals.net >= 0 ? <TrendingUp className="h-5 w-5 shrink-0 text-teal-300" /> : <TrendingDown className="h-5 w-5 shrink-0 text-rose-300" />}
            <div className="min-w-0">
              <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-200">Nettoresultat</div>
              <div className={`stat-num truncate text-2xl ${totals.net >= 0 ? 'text-teal-200' : 'text-rose-200'}`}><SensitiveKr value={totals.net} /></div>
              <div className="text-[11px] text-zinc-300">exkl. saldo på lönekontot</div>
            </div>
          </div>
          <DailyAllowanceBadge
            dailyAmount={dailyAmount}
            remainingDays={remainingDays}
            paydayDay={payday.getDate()}
          />
        </div>
      </header>

      {surplusAtTop && (
        <PayrollSurplusSection
          meta={meta}
          savingsNames={resolveSavingsTargets(savingsRows).map((t) => t.name)}
          onCommitBalance={(v) => {
            void onUpdateMeta(month, { ending_balance: v }).catch((err) => {
              console.error(err instanceof Error ? err.message : err, err);
            });
          }}
          onOpenModal={openSurplusModal}
        />
      )}

      {rolloverBusy && monthEntries.length === 0 && (
        <p className="text-sm text-zinc-300">För över poster från föregående månad…</p>
      )}

      {showCopyPrompt && (
        <section className="card relative overflow-hidden border-teal-400/15 p-5 sm:p-6 animate-slide-up">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-400/10 text-teal-300">
              <Copy className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display font-semibold text-teal-200">Starta 2-minutersrutinen</h3>
              <p className="mt-1 text-sm text-zinc-300">
                {monthLabel(month)} är tom. Kopiera poster och sparfördelning från{' '}
                <b className="text-zinc-50">{monthLabel(previousMonthWithData!)}</b> och justera bara det som ändrats.
              </p>
              <button
                onClick={copyPrevious}
                disabled={copying}
                className="btn-primary mt-3 flex w-full items-center justify-center gap-2 px-4 py-2 text-sm sm:w-auto"
              >
                <Copy className="h-4 w-4" /> {copying ? 'Kopierar…' : `Kopiera från ${monthLabel(previousMonthWithData!)}`}
              </button>
            </div>
          </div>
        </section>
      )}

      {(showSuggestion || showDeficit || showApplied) && (
        <section className="card relative overflow-hidden border-sky-400/15 p-5 sm:p-6 animate-slide-up">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sky-400/10 blur-2xl" />
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-400/10 text-sky-400">
              {showApplied ? <Check className="h-5 w-5" /> : <Lightbulb className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              {showApplied ? (
                <>
                  <h3 className="font-display font-semibold text-teal-300">
                    {surplusNotice === 'cut' ? 'Sparande justerat!' : 'Överskott fördelat!'}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-300">
                    {surplusNotice === 'cut'
                      ? `${sensitiveKrText(appliedAmount, isPrivacyModeEnabled)} har sänkts på ${appliedLabels || 'dina sparanderader'}.`
                      : `${sensitiveKrText(appliedAmount, isPrivacyModeEnabled)} har lagts till på ${appliedLabels || 'dina sparanderader'}.`}
                  </p>
                </>
              ) : showDeficit ? (
                <>
                  <h3 className="font-display font-semibold text-amber-300">Förslag: Sänk sparande vid underskott</h3>
                  <p className="mt-1 text-sm text-zinc-300">
                    Nettoresultatet är {sensitiveKrText(totals.net, isPrivacyModeEnabled)}. Förslag utifrån dina rader med saldo:
                    {' '}
                    {deficitCuts.map((c) => `${c.name} −${sensitiveKrText(c.reduce, isPrivacyModeEnabled)}`).join(', ')}.
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <button
                      type="button"
                      onClick={applyDeficitCuts}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300/90 px-4 py-2 text-sm font-semibold text-amber-950 transition-all duration-200 hover:bg-amber-200 sm:w-auto"
                    >
                      <PiggyBank className="h-4 w-4" /> Sänk med {sensitiveKrText(deficitTotal, isPrivacyModeEnabled)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSurplusNotice('dismissed')}
                      className="btn-secondary flex w-full items-center justify-center gap-2 sm:w-auto"
                    >
                      <X className="h-4 w-4" /> Inte nu
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="font-display font-semibold text-sky-300">Förslag: Öka ditt sparande</h3>
                  <p className="mt-1 text-sm text-zinc-300">
                    Ditt nettoresultat överstiger 10% av inkomsten. {sensitiveKrText(boostAmount, isPrivacyModeEnabled)} kan flyttas till sparande
                    utan att netto går under 10% eller blir negativt.
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <button
                      onClick={distributeExcessSurplus}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-300/90 px-4 py-2 text-sm font-semibold text-sky-950 transition-all duration-200 hover:bg-sky-200 sm:w-auto"
                    >
                      <PiggyBank className="h-4 w-4" /> Fördela {sensitiveKrText(boostAmount, isPrivacyModeEnabled)}
                    </button>
                    <button
                      onClick={() => setSurplusNotice('dismissed')}
                      className="btn-secondary flex w-full items-center justify-center gap-2 sm:w-auto"
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

      <div className="grid min-w-0 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className={`card flex min-w-0 items-center gap-4 p-5 ring-1 sm:p-6 ${s.ring} animate-fade-in`}>
            <span className={`grid h-11 w-11 place-items-center rounded-xl bg-white/5 ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </span>
            <div>
              <div className="text-xs font-medium text-zinc-200">{s.label}</div>
              <div className={`stat-num min-w-0 truncate text-xl ${s.color}`}><SensitiveKr value={s.value} /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <EntryList title="Inkomster" hint="Lön, sidoinkomster m.m." accent="emerald"
          icon={<Wallet className="h-5 w-5" />} category="income" month={month}
          entries={incomeEntries} total={sum('income')} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} />
        <EntryList title="Fasta kostnader" hint="Hyra, abonnemang, lån" accent="amber"
          icon={<Building2 className="h-5 w-5" />} category="fixed" month={month}
          entries={byCat('fixed')} total={sum('fixed')} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} />
        <EntryList title="Rörliga kostnader" hint="Mat, shopping, nöje" accent="sky"
          icon={<ShoppingBag className="h-5 w-5" />} category="variable" month={month}
          entries={byCat('variable')} total={sum('variable')} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} />
        <EntryList title="Målinriktat sparande" hint="Dina sparanderader – överskott fördelas på dessa" accent="violet"
          icon={<Target className="h-5 w-5" />} category="savings" month={month}
          entries={byCat('savings')} total={sum('savings')} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} />
      </div>

      {!surplusAtTop && (
        <PayrollSurplusSection
          meta={meta}
          savingsNames={resolveSavingsTargets(savingsRows).map((t) => t.name)}
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
          savingsRows={savingsRows}
          onClose={() => setModalOpen(false)}
          onSaveRules={(patch) => onUpdateMeta(month, patch)}
          onApply={applySurplus}
        />
      )}
    </div>
  );
}
