import { useEffect, useState, type FormEvent } from 'react';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { readLoginAuthError, readLoginAuthInfo } from '@/lib/authRedirect';
import { requestPasswordReset, signInWithMagicLink, signInWithPassword, signUpWithPassword } from '@/lib/supabase/auth';
import VenlyLogo from '@/components/VenlyLogo';

type Mode = 'login' | 'signup' | 'forgot';

const EMAIL_KEY = 'venly.rememberedEmail';

function readSavedEmail(): string {
  try {
    return localStorage.getItem(EMAIL_KEY) ?? '';
  } catch {
    return '';
  }
}

function rememberEmail(value: string) {
  try {
    localStorage.setItem(EMAIL_KEY, value.trim());
  } catch {
    /* ignore quota / private mode */
  }
}

export default function AuthView() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState(readSavedEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(() => readLoginAuthError());
  const [info, setInfo] = useState<string | null>(() => readLoginAuthInfo());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!readLoginAuthError() && !readLoginAuthInfo()) return;
    window.history.replaceState({}, '', '/');
  }, []);

  const submitPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const trimmed = email.trim();
    if (!trimmed || (mode === 'signup' && password.length < 6) || (mode === 'login' && !password)) {
      setError(mode === 'signup' ? 'Lösenordet måste vara minst 6 tecken.' : 'Fyll i e-post och lösenord.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        const res = await signInWithPassword(trimmed, password);
        if (res.data.session) {
          rememberEmail(trimmed);
          return;
        }
        setError(res.message ?? 'Inloggning misslyckades. Försök igen.');
        setBusy(false);
        return;
      }
      const res = await signUpWithPassword(trimmed, password);
      if (res.message) {
        setError(res.message);
        setBusy(false);
        return;
      }
      rememberEmail(trimmed);
      if (res.data.session) return;
      setInfo('Konto skapat! Kontrollera din e-post för att bekräfta din inloggning.');
      setBusy(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(message, err);
      setError(message || 'Inloggning misslyckades. Försök igen.');
      setBusy(false);
    }
  };

  const sendResetLink = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Ange din e-postadress så skickar vi en återställningslänk.');
      return;
    }
    setBusy(true);
    try {
      const res = await requestPasswordReset(trimmed);
      if (res.message) setError(res.message);
      else {
        rememberEmail(trimmed);
        setInfo('Om kontot finns skickar vi en länk för att välja nytt lösenord.');
      }
    } finally {
      setBusy(false);
    }
  };

  const sendMagicLink = async () => {
    setError(null);
    setInfo(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Ange din e-postadress för magisk länk.');
      return;
    }
    setBusy(true);
    try {
      const res = await signInWithMagicLink(trimmed);
      if (res.message) setError(res.message);
      else {
        rememberEmail(trimmed);
        setInfo('En inloggningslänk har skickats till din e-post.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full max-w-full flex-col items-center justify-center overflow-x-hidden px-4 py-10">
      <div className="mb-8 flex items-center gap-3 animate-fade-in">
        <VenlyLogo size={40} />
        <div>
          <h1 className="font-display text-2xl font-bold leading-none text-slate-50">
            Ven<span className="text-emerald-400">ly</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Smartare kontroll över din ekonomi</p>
        </div>
      </div>

      <section className="card w-full max-w-md p-6 sm:p-8 animate-scale-in">
        <div className="mb-6 grid grid-cols-2 rounded-xl bg-white/5 p-1">
          {(['login', 'signup'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => { setMode(id); setError(null); setInfo(null); }}
              className={`rounded-lg py-2 text-sm font-medium transition ${
                mode === id ? 'bg-ink-800 text-emerald-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {id === 'login' ? 'Logga in' : 'Skapa konto'}
            </button>
          ))}
        </div>

        {mode === 'forgot' ? (
          <>
            <h2 className="font-display text-xl font-bold text-slate-50">Glömt lösenord?</h2>
            <p className="mt-1 mb-5 text-sm text-slate-500">
              Ange din e-postadress så skickar vi en länk för att välja ett nytt lösenord.
            </p>
            <form onSubmit={sendResetLink} className="space-y-3">
              <label className="block" htmlFor="reset-email">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <Mail className="h-3.5 w-3.5" /> E-post
                </span>
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-ink-850 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-400/60"
                  placeholder="du@epost.se"
                  required
                />
              </label>
              {error && (
                <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-300">{error}</p>
              )}
              {info && (
                <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">{info}</p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Skicka återställningslänk
              </button>
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); setInfo(null); }}
                className="w-full py-2 text-sm text-slate-400 transition hover:text-slate-200"
              >
                Tillbaka till inloggning
              </button>
            </form>
          </>
        ) : (
          <>
        <h2 className="font-display text-xl font-bold text-slate-50">
          {mode === 'login' ? 'Välkommen tillbaka' : 'Kom igång'}
        </h2>
        <p className="mt-1 mb-5 text-sm text-slate-500">
          {mode === 'login'
            ? 'Logga in för att se din budget.'
            : 'Skapa ett konto så sätter vi upp en tom månadsbudget åt dig.'}
        </p>

        <form method="post" autoComplete="on" onSubmit={submitPassword} className="space-y-3">
          <label className="block" htmlFor="auth-email">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <Mail className="h-3.5 w-3.5" /> E-post
            </span>
            <input
              id="auth-email"
              name="username"
              type="email"
              autoComplete="username"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-ink-850 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-400/60"
              placeholder="du@epost.se"
              required
            />
          </label>
          <label className="block" htmlFor="auth-password">
            <span className="mb-1.5 flex items-center justify-between gap-1.5 text-xs font-medium text-slate-400">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" /> Lösenord
              </span>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(null); setInfo(null); }}
                  className="font-medium text-emerald-400/90 transition hover:text-emerald-300"
                >
                  Glömt lösenord?
                </button>
              )}
            </span>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-ink-850 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-400/60"
              placeholder={mode === 'signup' ? 'Minst 6 tecken' : '••••••••'}
              minLength={mode === 'signup' ? 6 : undefined}
              required
            />
          </label>

          {error && (
            <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-300">{error}</p>
          )}
          {info && (
            <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">{info}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'login' ? 'Logga in' : 'Skapa konto'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wide text-slate-600">
          <span className="h-px flex-1 bg-white/10" />
          eller
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={sendMagicLink}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:text-slate-100 disabled:opacity-60"
        >
          <Mail className="h-4 w-4 text-emerald-400" />
          Skicka magisk länk
        </button>
          </>
        )}
      </section>
    </div>
  );
}
