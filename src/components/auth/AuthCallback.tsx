import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { EmailOtpType, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import {
  getAuthCodeFromUrl,
  getAuthLinkError,
  getHashSessionFromUrl,
  getTokenHashFromUrl,
} from '@/lib/authRedirect';
import { claimAuthExchange } from '@/lib/authExchangeLock';
import { waitForSession } from '@/lib/supabase/auth';
import VenlyLogo from '@/components/VenlyLogo';

export default function AuthCallback({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const hasExchangedCode = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let finished = false;

    const fail = (raw: string) => {
      console.error(raw);
      if (!cancelled && !finished) setError(raw);
    };

    const goToDashboard = (session?: Session | null) => {
      if (cancelled || finished || !session) return;
      finished = true;
      window.history.replaceState({}, '', '/');
      onDone();
    };

    if (!supabase) {
      fail('Supabase är inte konfigurerad. Sätt VITE_SUPABASE_URL och VITE_SUPABASE_ANON_KEY i Vercel och bygg om.');
      return () => {
        cancelled = true;
      };
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        goToDashboard(session);
      }
    });

    const run = async () => {
      try {
        const linkError = getAuthLinkError();
        if (linkError) {
          fail(linkError);
          return;
        }

        const existing = await supabase.auth.getSession();
        if (existing.error) console.error(existing.error.message, existing.error);
        if (existing.data.session) {
          goToDashboard(existing.data.session);
          return;
        }

        const code = getAuthCodeFromUrl();
        if (code) {
          if (hasExchangedCode.current || !claimAuthExchange(`code:${code}`)) {
            const session = await waitForSession();
            if (cancelled || finished) return;
            if (session) goToDashboard(session);
            else fail('Kunde inte slutföra inloggningen. Öppna länken från e-posten igen.');
            return;
          }
          hasExchangedCode.current = true;
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error(exchangeError.message, exchangeError);
            const after = await supabase.auth.getSession();
            if (after.data.session) {
              goToDashboard(after.data.session);
              return;
            }
            fail(exchangeError.message);
            return;
          }
          if (data.session) {
            goToDashboard(data.session);
            return;
          }
        }

        const hashed = getTokenHashFromUrl();
        if (hashed) {
          if (!claimAuthExchange(`otp:${hashed.token_hash}`)) {
            const session = await waitForSession();
            if (cancelled || finished) return;
            if (session) goToDashboard(session);
            else fail('Kunde inte slutföra inloggningen. Öppna länken från e-posten igen.');
            return;
          }
          const { data, error: otpError } = await supabase.auth.verifyOtp({
            token_hash: hashed.token_hash,
            type: hashed.type as EmailOtpType,
          });
          if (otpError) {
            console.error(otpError.message, otpError);
            if (!data.session) {
              fail(otpError.message);
              return;
            }
          }
          if (data.session) {
            goToDashboard(data.session);
            return;
          }
        }

        const implicit = getHashSessionFromUrl();
        if (implicit) {
          if (!claimAuthExchange(`hash:${implicit.access_token.slice(0, 24)}`)) {
            const session = await waitForSession();
            if (cancelled || finished) return;
            if (session) goToDashboard(session);
            return;
          }
          const { data, error: sessionError } = await supabase.auth.setSession(implicit);
          if (sessionError) {
            console.error(sessionError.message, sessionError);
            if (!data.session) {
              fail(sessionError.message);
              return;
            }
          }
          if (data.session) {
            goToDashboard(data.session);
            return;
          }
        }

        const session = await waitForSession();
        if (cancelled || finished) return;
        if (session) {
          goToDashboard(session);
          return;
        }

        fail('Kunde inte slutföra inloggningen. Öppna länken från e-posten igen.');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        fail(message);
      }
    };

    void run();
    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [onDone]);

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <div className="card w-full max-w-md p-6 text-center">
          <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-300">{error}</p>
          <button
            type="button"
            onClick={() => {
              window.history.replaceState({}, '', '/');
              onDone();
            }}
            className="mt-4 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
          >
            Tillbaka till inloggning
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center text-slate-500">
      <div className="text-center">
        <VenlyLogo size={40} className="mx-auto mb-4" />
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-400" />
        <p className="mt-4 text-sm">Bekräftar inloggningen…</p>
      </div>
    </div>
  );
}
