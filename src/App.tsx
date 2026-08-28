import { useCallback, useState } from 'react';
import { Wallet, LineChart, CheckSquare, Lightbulb } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFinance } from '@/hooks/useFinance';
import { currentMonth } from '@/lib/format';
import { isAuthCallbackLocation, isResetPasswordLocation } from '@/lib/authRedirect';
import MonthlyView from '@/components/monthly/MonthlyView';
import AnalyticsView from '@/components/analytics/AnalyticsView';
import InsightView from '@/components/insight/InsightView';
import PaymentsView from '@/components/payments/PaymentsView';
import AuthView from '@/components/auth/AuthView';
import AuthCallback from '@/components/auth/AuthCallback';
import ResetPassword from '@/pages/ResetPassword';
import UserMenu from '@/components/auth/UserMenu';
import VenlyLogo from '@/components/VenlyLogo';

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
  const [resetPassword, setResetPassword] = useState(() => isResetPasswordLocation());
  const finishCallback = useCallback(() => setHandlingCallback(false), []);
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
      <div className="grid min-h-screen place-items-center text-slate-500">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-emerald-400" />
          <p className="mt-4 text-sm">Kontrollerar inloggning…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 isolate border-b border-white/5 bg-ink-950">
        <div className="pointer-events-auto mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <VenlyLogo size={40} />
            <div>
              <h1 className="font-display text-lg font-bold leading-none text-slate-50">
                Ven<span className="text-emerald-400">ly</span>
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">Smartare kontroll över din ekonomi</p>
            </div>
          </div>
          <UserMenu user={user} onSignOut={signOut} />
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-2 px-3 py-3 text-sm font-medium transition sm:px-4 ${active ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <t.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
                {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-emerald-400" />}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {finance.error && (
          <div className="mb-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
            {finance.error}
          </div>
        )}

        {finance.loading ? (
          <div className="grid place-items-center py-32 text-slate-500">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-emerald-400" />
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

      <footer className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 pb-8 pt-4 text-xs text-slate-600 sm:px-6">
        <VenlyLogo size={32} />
        <span>Venly · Smartare kontroll över din ekonomi.</span>
      </footer>
    </div>
  );
}

export default App;
