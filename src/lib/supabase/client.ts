import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  console.error(
    'Saknar VITE_SUPABASE_URL eller VITE_SUPABASE_ANON_KEY. Sätt dem i Vercel och bygg om — appen startar inte mot Supabase utan dessa.',
  );
}

type BrowserClient = SupabaseClient;
let browserClient: BrowserClient | null = null;

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

export function createClient(): BrowserClient | null {
  if (!isSupabaseConfigured) return null;

  browserClient = createSupabaseClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // AuthCallback owns PKCE/OTP exchange once — auto-detect would consume the same one-time code.
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
    global: {
      fetch: async (input, init) => {
        const target = requestUrl(input);
        const isRest = target.includes('/rest/v1/');
        const headers = new Headers(init?.headers);

        if (isRest && !headers.get('Authorization') && browserClient) {
          const { data: { session }, error } = await browserClient.auth.getSession();
          if (error) {
            console.error('[PGRST] getSession före query', error.message, error);
          }
          if (session?.access_token) {
            headers.set('Authorization', `Bearer ${session.access_token}`);
            if (anonKey) headers.set('apikey', anonKey);
            const res = await fetch(input, { ...init, headers });
            if (!res.ok) {
              const body = await res.clone().text().catch(() => '');
              console.error('[PGRST] HTTP', res.status, target, body);
            }
            return res;
          }
          console.error('[PGRST] saknar JWT på', target);
        }

        const res = await fetch(input, init);
        if (isRest && !res.ok) {
          const body = await res.clone().text().catch(() => '');
          console.error('[PGRST] HTTP', res.status, target, body);
        }
        return res;
      },
    },
  });
  return browserClient;
}

/** Delad webbläsarklient — samma session (JWT) till Auth och PostgREST/RLS. */
export const supabase = createClient();

export function requireSupabase(): BrowserClient {
  if (!supabase) {
    const error = new Error(
      'Supabase är inte konfigurerad. Sätt VITE_SUPABASE_URL och VITE_SUPABASE_ANON_KEY i Vercel och bygg om.',
    );
    console.error(error.message);
    throw error;
  }
  return supabase;
}
