import type { PostgrestError } from '@supabase/supabase-js';

export function logSupabaseError(error: unknown, context?: string) {
  const err = error as Partial<PostgrestError> & { status?: number; message?: string };
  console.error('[PGRST]', context ?? 'supabase', {
    message: err?.message,
    code: err?.code,
    details: err?.details,
    hint: err?.hint,
    status: err?.status,
    error,
  });
}

export function supabaseErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;
  const err = error as Partial<PostgrestError> & { message?: string };
  const parts = [err.message, err.details, err.hint, err.code].filter(Boolean);
  return parts.length > 0 ? parts.join(' — ') : fallback;
}
