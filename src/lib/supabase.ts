export { createClient, supabase } from './supabase/client';
export {
  getSession,
  getUser,
  signOut,
  signInWithPassword,
  signUpWithPassword,
  signInWithMagicLink,
  waitForSession,
} from './supabase/auth';
