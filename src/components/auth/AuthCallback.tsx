import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import type { EmailOtpType, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { friendlyAuthCallbackMessage } from '@/lib/authErrors';
import {
  getAuthCodeFromUrl,
  getAuthLinkError,
  getHashSessionFromUrl,
  getTokenHashFromUrl,
  loginUrl,
} from '@/lib/authRedirect';
import { claimAuthCallbackEffect, claimAuthExchange } from '@/lib/authExchangeLock';
import { waitForSession } from '@/lib/supabase/auth';
import VenlyLogo from '@/components/VenlyLogo';

export default function AuthCallback({ onDone }: { onDone: () => void }) {
  const hasHandledAuth = useRef(false);

  useEffect(() => {
    if (hasHandledAuth.current) return;
    hasHandledAuth.current = true;

    const ownsExchange = claimAuthCallbackEffect();

    const goToDashboard = (session?: Session | null) => {
      if (!session) return;
      window.history.replaceState({}, '', '/');
      onDone();
    };

    const goToLogin = (raw: string) => {
      const message = friendlyAuthCallbackMessage(raw);
      console.error(raw);
      window.history.replaceState({}, '', loginUrl(message));
      onDone();
    };

    if (!supabase) {
      goToLogin('Supabase är inte konfigurerad.');
      return;
    }

    const client = supabase;

    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session) {
        goToDashboard(session);
      }
    });

    const waitThenFinish = async () => {
      const session = await waitForSession();
      if (session) goToDashboard(session);
      else goToLogin('Kunde inte slutföra inloggningen. Öppna länken från e-posten igen.');
    };

    if (!ownsExchange) {
      void waitThenFinish();
      return () => {
        listener.subscription.unsubscribe();
      };
    }

    const code = getAuthCodeFromUrl();
    const hashed = getTokenHashFromUrl();
    const implicit = getHashSessionFromUrl();
    const canExchangeCode = Boolean(code && claimAuthExchange(`code:${code}`));
    const canVerifyOtp = Boolean(hashed && claimAuthExchange(`otp:${hashed.token_hash}`));
    const canSetHash = Boolean(implicit && claimAuthExchange(`hash:${implicit.access_token.slice(0, 24)}`));

    const run = async () => {
      try {
        const linkError = getAuthLinkError();
        if (linkError) {
          goToLogin(linkError);
          return;
        }

        const existing = await client.auth.getSession();
        if (existing.error) console.error(existing.error.message, existing.error);
        if (existing.data.session?.user) {
          goToDashboard(existing.data.session);
          return;
        }

        if (code) {
          if (!canExchangeCode) {
            await waitThenFinish();
            return;
          }
          const { data, error: exchangeError } = await client.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error(exchangeError.message, exchangeError);
            const after = await client.auth.getSession();
            if (after.data.session?.user) {
              goToDashboard(after.data.session);
              return;
            }
            goToLogin(exchangeError.message);
            return;
          }
          if (data.session) {
            goToDashboard(data.session);
            return;
          }
        }

        if (hashed) {
          if (!canVerifyOtp) {
            await waitThenFinish();
            return;
          }
          const { data, error: otpError } = await client.auth.verifyOtp({
            token_hash: hashed.token_hash,
            type: hashed.type as EmailOtpType,
          });
          if (otpError) {
            console.error(otpError.message, otpError);
            if (!data.session) {
              goToLogin(otpError.message);
              return;
            }
          }
          if (data.session) {
            goToDashboard(data.session);
            return;
          }
        }

        if (implicit) {
          if (!canSetHash) {
            await waitThenFinish();
            return;
          }
          const { data, error: sessionError } = await client.auth.setSession(implicit);
          if (sessionError) {
            console.error(sessionError.message, sessionError);
            if (!data.session) {
              goToLogin(sessionError.message);
              return;
            }
          }
          if (data.session) {
            goToDashboard(data.session);
            return;
          }
        }

        await waitThenFinish();
      } catch (err) {
        goToLogin(err instanceof Error ? err.message : String(err));
      }
    };

    void run();
    return () => {
      listener.subscription.unsubscribe();
    };
  }, [onDone]);

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
