import { useCallback, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { logSupabaseError } from '@/lib/supabaseErrors';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      console.error('Saknar VITE_SUPABASE_URL eller VITE_SUPABASE_ANON_KEY');
      setLoading(false);
      return;
    }
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      try {
        if (event === 'TOKEN_REFRESHED' && !next) return;
        if (next?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED')) {
          setSession(next);
          setUser(next.user);
          setLoading(false);
          return;
        }
        setSession(next);
        setUser(next?.user ?? null);
        setLoading(false);
      } catch (err) {
        logSupabaseError(err, 'onAuthStateChange');
        setLoading(false);
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) logSupabaseError(error, 'signOut');
  }, []);

  return { session, user, loading, signOut };
}
