import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Saknar VITE_SUPABASE_URL eller VITE_SUPABASE_ANON_KEY i .env');
}

type BrowserClient = ReturnType<typeof createSupabaseClient>;
let browserClient: BrowserClient | null = null;

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

export function createClient() {
  browserClient = createSupabaseClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
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
