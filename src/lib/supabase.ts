export { createClient, supabase, isSupabaseConfigured, requireSupabase } from './supabase/client';
export {
  getSession,
  getUser,
  signOut,
  signInWithPassword,
  signUpWithPassword,
  signInWithMagicLink,
  waitForSession,
  requestPasswordReset,
  updatePassword,
} from './supabase/auth';
