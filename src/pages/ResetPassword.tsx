import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Loader2, Lock } from 'lucide-react';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { friendlyAuthCallbackMessage } from '@/lib/authErrors';
import {
  getAuthCodeFromUrl,
  getAuthLinkError,
  getHashSessionFromUrl,
  getTokenHashFromUrl,
  loginUrl,
} from '@/lib/authRedirect';
import { claimAuthExchange, claimResetPasswordEffect } from '@/lib/authExchangeLock';
import { signOut, updatePassword, waitForSession } from '@/lib/supabase/auth';
import VenlyLogo from '@/components/VenlyLogo';

export default function ResetPassword({ onLeave }: { onLeave: () => void }) {
  const hasHandledAuth = useRef(false);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hasHandledAuth.current) return;
    hasHandledAuth.current = true;

    const ownsExchange = claimResetPasswordEffect();

    const fail = (raw: string) => {
      console.error(raw);
      window.history.replaceState({}, '', loginUrl(friendlyAuthCallbackMessage(raw)));
      onLeave();
    };

    if (!supabase) {
      fail('Supabase är inte konfigurerad.');
      return;
    }

    const client = supabase;
    const code = getAuthCodeFromUrl();
    const hashed = getTokenHashFromUrl();
    const implicit = getHashSessionFromUrl();
    const canExchangeCode = Boolean(code && claimAuthExchange(`recovery-code:${code}`));
    const canVerifyOtp = Boolean(hashed && claimAuthExchange(`recovery-otp:${hashed.token_hash}`));
    const canSetHash = Boolean(implicit && claimAuthExchange(`recovery-hash:${implicit.access_token.slice(0, 24)}`));

    const run = async () => {
      try {
        const linkError = getAuthLinkError();
        if (linkError) {
          fail(linkError);
          return;
        }

        const existing = await client.auth.getSession();
        if (existing.data.session?.user) {
          window.history.replaceState({}, '', '/reset-password');
          setReady(true);
          return;
        }

        if (!ownsExchange) {
          const session = await waitForSession();
          if (session) {
            window.history.replaceState({}, '', '/reset-password');
            setReady(true);
            return;
          }
          fail('Återställningslänken är ogiltig eller har gått ut. Begär en ny.');
          return;
        }

        if (code && canExchangeCode) {
          const { data, error: exchangeError } = await client.auth.exchangeCodeForSession(code);
          if (exchangeError && !data.session) {
            fail(exchangeError.message);
            return;
          }
        } else if (hashed && canVerifyOtp) {
          const { data, error: otpError } = await client.auth.verifyOtp({
            token_hash: hashed.token_hash,
            type: (hashed.type || 'recovery') as EmailOtpType,
          });
          if (otpError && !data.session) {
            fail(otpError.message);
            return;
          }
        } else if (implicit && canSetHash) {
          const { data, error: sessionError } = await client.auth.setSession(implicit);
          if (sessionError && !data.session) {
            fail(sessionError.message);
            return;
          }
        }

        const session = existing.data.session ?? await waitForSession();
        if (!session) {
          fail('Återställningslänken är ogiltig eller har gått ut. Begär en ny.');
          return;
        }
        window.history.replaceState({}, '', '/reset-password');
        setReady(true);
      } catch (err) {
        fail(err instanceof Error ? err.message : String(err));
      }
    };

    void run();
  }, [onLeave]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 6) {
      setError('Lösenordet måste vara minst 6 tecken.');
      return;
    }
    if (password !== confirm) {
      setError('Lösenorden matchar inte.');
      return;
    }
    setBusy(true);
    const res = await updatePassword(password);
    if (res.message) {
      setError(res.message);
      setBusy(false);
      return;
    }
    setInfo('Lösenordet är uppdaterat. Du skickas till inloggningen…');
    await signOut();
    window.history.replaceState({}, '', loginUrl(undefined, 'Lösenordet är uppdaterat. Logga in med ditt nya lösenord.'));
    onLeave();
  };

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-slate-500">
        <div className="text-center">
          <VenlyLogo size={40} className="mx-auto mb-4" />
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-400" />
          <p className="mt-4 text-sm">Förbereder återställning…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-3">
        <VenlyLogo size={40} />
        <div>
          <h1 className="font-display text-2xl font-bold leading-none text-slate-50">
            Ven<span className="text-emerald-400">ly</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Välj ett nytt lösenord</p>
        </div>
      </div>

      <section className="card w-full max-w-md p-6 sm:p-8">
        <h2 className="font-display text-xl font-bold text-slate-50">Återställ lösenord</h2>
        <p className="mt-1 mb-5 text-sm text-slate-500">Ange ett nytt lösenord för ditt konto.</p>

        <form onSubmit={submit} className="space-y-3">
          <label className="block" htmlFor="new-password">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <Lock className="h-3.5 w-3.5" /> Nytt lösenord
            </span>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-ink-850 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-emerald-400/60"
              placeholder="Minst 6 tecken"
              minLength={6}
              required
            />
          </label>
          <label className="block" htmlFor="confirm-password">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <Lock className="h-3.5 w-3.5" /> Bekräfta lösenord
            </span>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-ink-850 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-emerald-400/60"
              placeholder="Upprepa lösenordet"
              minLength={6}
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
            Spara nytt lösenord
          </button>
        </form>
      </section>
    </div>
  );
}
