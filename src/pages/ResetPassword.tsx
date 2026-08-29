import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Loader2, Lock } from 'lucide-react';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { friendlyResetLinkMessage } from '@/lib/authErrors';
import {
  getAuthCodeFromUrl,
  getAuthLinkError,
  getHashSessionFromUrl,
  getTokenHashFromUrl,
  loginUrl,
} from '@/lib/authRedirect';
import { claimAuthExchange, claimResetPasswordEffect } from '@/lib/authExchangeLock';
import { signOut, updatePassword, waitForSession } from '@/lib/supabase/auth';
import Logo from '@/components/Logo';

export default function ResetPassword({ onLeave }: { onLeave: () => void }) {
  const hasHandledReset = useRef(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hasHandledReset.current) return;
    hasHandledReset.current = true;

    const ownsExchange = claimResetPasswordEffect();

    const fail = (raw: string) => {
      console.error(raw);
      window.history.replaceState({}, '', loginUrl(friendlyResetLinkMessage(raw)));
      onLeave();
    };

    const allowPasswordForm = () => {
      window.history.replaceState({}, '', '/reset-password');
      setIsResettingPassword(true);
    };

    if (!supabase) {
      fail('Supabase är inte konfigurerad.');
      return;
    }

    const client = supabase;

    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'USER_UPDATED') && session) {
        allowPasswordForm();
      }
    });

    const run = async () => {
      try {
        const existing = await client.auth.getSession();
        if (existing.error) console.error(existing.error.message, existing.error);
        if (existing.data.session?.user) {
          allowPasswordForm();
          return;
        }

        const linkError = getAuthLinkError();
        if (linkError) {
          fail(linkError);
          return;
        }

        if (!ownsExchange) {
          const session = await waitForSession();
          if (session) allowPasswordForm();
          else fail('Återställningslänken är ogiltig eller har gått ut. Begär en ny.');
          return;
        }

        const code = getAuthCodeFromUrl();
        const hashed = getTokenHashFromUrl();
        const implicit = getHashSessionFromUrl();

        if (code && claimAuthExchange(`recovery-code:${code}`)) {
          const { data, error: exchangeError } = await client.auth.exchangeCodeForSession(code);
          if (data.session) {
            allowPasswordForm();
            return;
          }
          const after = await client.auth.getSession();
          if (after.data.session?.user) {
            allowPasswordForm();
            return;
          }
          if (exchangeError) {
            fail(exchangeError.message);
            return;
          }
        } else if (hashed && claimAuthExchange(`recovery-otp:${hashed.token_hash}`)) {
          const { data, error: otpError } = await client.auth.verifyOtp({
            token_hash: hashed.token_hash,
            type: (hashed.type || 'recovery') as EmailOtpType,
          });
          if (data.session) {
            allowPasswordForm();
            return;
          }
          if (otpError) {
            fail(otpError.message);
            return;
          }
        } else if (implicit && claimAuthExchange(`recovery-hash:${implicit.access_token.slice(0, 24)}`)) {
          const { data, error: sessionError } = await client.auth.setSession(implicit);
          if (data.session) {
            allowPasswordForm();
            return;
          }
          if (sessionError) {
            fail(sessionError.message);
            return;
          }
        }

        const session = await waitForSession();
        if (session) allowPasswordForm();
        else fail('Återställningslänken är ogiltig eller har gått ut. Begär en ny.');
      } catch (err) {
        fail(err instanceof Error ? err.message : String(err));
      }
    };

    void run();
    return () => {
      listener.subscription.unsubscribe();
    };
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
    try {
      sessionStorage.removeItem('venly_password_reset');
    } catch {
      /* ignore */
    }
    await signOut();
    window.history.replaceState({}, '', loginUrl(undefined, 'Lösenordet är uppdaterat. Logga in med ditt nya lösenord.'));
    onLeave();
  };

  if (!isResettingPassword) {
    return (
      <div className="grid min-h-screen place-items-center text-zinc-300">
        <div className="text-center">
          <Logo size={40} className="mx-auto mb-4" />
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-300" />
          <p className="mt-4 text-sm">Förbereder återställning…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full max-w-full flex-col items-center justify-center overflow-x-hidden px-4 py-10">
      <div className="mb-8 flex items-center gap-3">
        <Logo size={44} />
        <div>
          <h1 className="font-display text-2xl font-bold leading-none text-zinc-50">
            Ven<span className="text-teal-300">ly</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-300">Välj ett nytt lösenord</p>
        </div>
      </div>

      <section className="card w-full max-w-md p-6 sm:p-8">
        <h2 className="font-display text-xl font-bold text-zinc-50">Återställ lösenord</h2>
        <p className="mt-1 mb-5 text-sm text-zinc-300">Ange ett nytt lösenord för ditt konto.</p>

        <form onSubmit={submit} className="space-y-3">
          <label className="block" htmlFor="new-password">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-300">
              <Lock className="h-3.5 w-3.5" /> Nytt lösenord
            </span>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field w-full px-3 py-2.5 text-sm text-zinc-100 outline-none transition-all duration-200"
              placeholder="Minst 6 tecken"
              minLength={6}
              required
            />
          </label>
          <label className="block" htmlFor="confirm-password">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-300">
              <Lock className="h-3.5 w-3.5" /> Bekräfta lösenord
            </span>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="field w-full px-3 py-2.5 text-sm text-zinc-100 outline-none transition-all duration-200"
              placeholder="Upprepa lösenordet"
              minLength={6}
              required
            />
          </label>

          {error && (
            <p className="rounded-2xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-sm text-rose-200">{error}</p>
          )}
          {info && (
            <p className="rounded-2xl border border-teal-400/20 bg-teal-400/10 px-3 py-2 text-sm text-teal-200">{info}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-primary flex w-full items-center justify-center gap-2"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Spara nytt lösenord
          </button>
        </form>
      </section>
    </div>
  );
}
