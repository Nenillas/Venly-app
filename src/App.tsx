import { useCallback, useState } from 'react';
import { Wallet, LineChart, CheckSquare, Lightbulb } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFinance } from '@/hooks/useFinance';
import { currentMonth } from '@/lib/format';
import { isAuthCallbackLocation, isRecoveryAuthLocation, isResetPasswordLocation } from '@/lib/authRedirect';
import MonthlyView from '@/components/monthly/MonthlyView';
import AnalyticsView from '@/components/analytics/AnalyticsView';
import InsightView from '@/components/insight/InsightView';
import PaymentsView from '@/components/payments/PaymentsView';
import AuthView from '@/components/auth/AuthView';
import AuthCallback from '@/components/auth/AuthCallback';
import ResetPassword from '@/pages/ResetPassword';
import UserMenu from '@/components/auth/UserMenu';
import Logo from '@/components/Logo';

type Tab = 'monthly' | 'payments' | 'analytics' | 'insight';

const TABS: { id: Tab; label: string; icon: typeof Wallet }[] = [
  { id: 'monthly', label: 'Månadsöversikt', icon: Wallet },
  { id: 'payments', label: 'Betalningar', icon: CheckSquare },
  { id: 'analytics', label: 'Historik & Hälsa', icon: LineChart },
  { id: 'insight', label: 'AI-insikt', icon: Lightbulb },
];

function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('monthly');
  const [month, setMonth] = useState(currentMonth);
  const [handlingCallback, setHandlingCallback] = useState(() => isAuthCallbackLocation());
  const [resetPassword, setResetPassword] = useState(
    () => isResetPasswordLocation() || isRecoveryAuthLocation(),
  );
  const finishCallback = useCallback(() => {
    setHandlingCallback(false);
    setResetPassword(isResetPasswordLocation() || isRecoveryAuthLocation());
  }, []);
  const leaveResetPassword = useCallback(() => setResetPassword(isResetPasswordLocation()), []);
  const finance = useFinance(user?.id, !authLoading && !handlingCallback && !resetPassword && Boolean(user));

  if (resetPassword) {
    return <ResetPassword onLeave={leaveResetPassword} />;
  }

  if (handlingCallback) {
    return <AuthCallback onDone={finishCallback} />;
  }

  if (authLoading) {
    return (
      <div className="grid min-h-screen place-items-center text-zinc-300">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-teal-300" />
          <p className="mt-4 text-sm">Kontrollerar inloggning…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden">
      <header className="sticky top-0 z-30 isolate border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl">
        <div className="page-shell pointer-events-auto flex items-center justify-between gap-2 py-3.5 sm:gap-4">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <Logo size={40} />
            <div className="min-w-0">
              <h1 className="font-display text-lg font-bold leading-none text-zinc-50">
                Ven<span className="text-teal-300">ly</span>
              </h1>
              <p className="mt-0.5 hidden truncate text-xs text-zinc-300 sm:block">Smartare kontroll över din ekonomi</p>
            </div>
          </div>
          <UserMenu user={user} onSignOut={signOut} />
        </div>

        <nav className="page-shell flex gap-1 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-medium transition-all duration-200 sm:px-4 ${active ? 'text-teal-300' : 'text-zinc-300 hover:text-zinc-50'}`}
              >
                <t.icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t.label}</span>
                {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-teal-300/90" />}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="page-shell relative z-10 py-6 sm:py-8">
        {finance.error && (
          <div className="mb-4 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">
            {finance.error}
          </div>
        )}

        {finance.loading ? (
          <div className="grid place-items-center py-32 text-zinc-300">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-teal-300" />
            <p className="mt-4 text-sm">Laddar din ekonomi…</p>
          </div>
        ) : tab === 'monthly' ? (
          <MonthlyView
            month={month}
            onMonthChange={setMonth}
            entries={finance.entries}
            getMeta={finance.getMeta}
            onAdd={finance.addEntry}
            onUpdate={finance.updateEntry}
            onDelete={finance.deleteEntry}
            onCopyMonth={finance.copyMonth}
            onUpdateMeta={finance.updateMeta}
          />
        ) : tab === 'payments' ? (
          <PaymentsView
            month={month}
            onMonthChange={setMonth}
            entries={finance.entries}
            onTogglePaid={finance.togglePaid}
          />
        ) : tab === 'analytics' ? (
          <AnalyticsView
            month={month}
            onMonthChange={setMonth}
            entries={finance.entries}
            getMeta={finance.getMeta}
          />
        ) : (
          <InsightView
            month={month}
            onMonthChange={setMonth}
            entries={finance.entries}
            getMeta={finance.getMeta}
          />
        )}
      </main>

      <footer className="page-shell flex flex-wrap items-center justify-center gap-2 pb-8 pt-4 text-center text-xs text-zinc-300">
        <Logo size={28} className="opacity-90" />
        <span>Venly · Smartare kontroll över din ekonomi.</span>
      </footer>
    </div>
  );
}

export default App;
