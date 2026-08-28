import { supabase } from './client';
import { mapAuthError } from '@/lib/authErrors';
import { passwordResetRedirectTo } from '@/lib/authRedirect';
import type { Session } from '@supabase/supabase-js';

const notConfigured =
  'Supabase är inte konfigurerad. Sätt VITE_SUPABASE_URL och VITE_SUPABASE_ANON_KEY i Vercel och bygg om.';

export async function getSession() {
  if (!supabase) return { session: null, error: new Error(notConfigured) };
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
}

export async function getUser() {
  if (!supabase) return { user: null, error: new Error(notConfigured) };
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error };
}

export const getCurrentUser = getUser;

/** Väntar tills Auth har en session (onAuthStateChange), så redirect inte vinner racet. */
export function waitForSession(timeoutMs = 8000): Promise<Session | null> {
  return new Promise((resolve) => {
    if (!supabase) {
      console.error(notConfigured);
      resolve(null);
      return;
    }
    const client = supabase;
    let settled = false;
    const finish = (session: Session | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription.unsubscribe();
      resolve(session);
    };

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (session) finish(session);
    });

    const timer = setTimeout(() => {
      void client.auth.getSession().then(({ data }) => finish(data.session));
    }, timeoutMs);

    void client.auth.getSession().then(({ data }) => {
      if (data.session) finish(data.session);
    });
  });
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) {
    console.error(notConfigured);
    return { data: { user: null, session: null }, error: new Error(notConfigured), message: notConfigured };
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) console.error(error.message, error);
  const session = data.session ?? await waitForSession();
  if (session) {
    return { data: { ...data, session, user: session.user }, error: null, message: null as string | null };
  }
  return {
    data,
    error,
    message: error ? mapAuthError(error.message) : 'Inloggning misslyckades. Försök igen.',
  };
}

export async function signUpWithPassword(email: string, password: string) {
  if (!supabase) {
    console.error(notConfigured);
    return { data: { user: null, session: null }, error: new Error(notConfigured), message: notConfigured };
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) {
    console.error(error.message, error);
    return { data, error, message: mapAuthError(error.message) };
  }
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    return { data, error: null, message: 'E-postadressen finns redan.' };
  }
  if (data.session) {
    await waitForSession();
  }
  return { data, error: null, message: null };
}

export async function signInWithMagicLink(email: string) {
  if (!supabase) {
    console.error(notConfigured);
    return { data: { user: null, session: null }, error: new Error(notConfigured), message: notConfigured };
  }
  try {
    sessionStorage.removeItem('venly_password_reset');
  } catch {
    /* ignore */
  }
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      shouldCreateUser: true,
    },
  });
  if (error) {
    console.error(error.message, error);
    return { data, error, message: `${mapAuthError(error.message)} (${error.message})` };
  }
  return { data, error: null, message: null };
}

export async function signOut() {
  if (!supabase) return { error: new Error(notConfigured) };
  return supabase.auth.signOut();
}

export async function requestPasswordReset(email: string) {
  if (!supabase) {
    console.error(notConfigured);
    return { error: new Error(notConfigured), message: notConfigured };
  }
  try {
    sessionStorage.setItem('venly_password_reset', '1');
  } catch {
    /* ignore quota / private mode */
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: passwordResetRedirectTo(),
  });
  if (error) {
    console.error(error.message, error);
    return { error, message: mapAuthError(error.message) };
  }
  return { error: null, message: null as string | null };
}

export async function updatePassword(password: string) {
  if (!supabase) {
    console.error(notConfigured);
    return { error: new Error(notConfigured), message: notConfigured };
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error(error.message, error);
    return { error, message: mapAuthError(error.message) };
  }
  return { error: null, message: null as string | null };
}
