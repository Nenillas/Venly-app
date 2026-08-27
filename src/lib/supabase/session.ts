import { supabase } from '@/lib/supabase/client';
import { logSupabaseError } from '@/lib/supabaseErrors';

/** JWT måste finnas så PostgREST sätter auth.uid() för RLS. */
export async function ensureAccessToken(): Promise<{ userId: string } | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('[PGRST] getSession', error.message, error);
    logSupabaseError(error, 'auth.getSession');
  }
  const session = data.session;
  if (!session?.access_token || !session.user?.id) {
    console.error('[PGRST] ingen inloggad session — RLS på public.monthly_records / public.budget_items kommer att neka.');
    return null;
  }
  return { userId: session.user.id };
}
