import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { logSupabaseError } from '@/lib/supabaseErrors';
import { parsePaydayDate, type PaydayDate } from '@/lib/payday';

export function usePaydayDate(user: User | null) {
  const [paydayDate, setPaydayDateState] = useState<PaydayDate>(() =>
    parsePaydayDate(user?.user_metadata?.payday_date),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPaydayDateState(parsePaydayDate(user?.user_metadata?.payday_date));
  }, [user?.id, user?.user_metadata?.payday_date]);

  const setPaydayDate = useCallback(async (next: PaydayDate) => {
    const previous = paydayDate;
    setPaydayDateState(next);
    if (!supabase) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { payday_date: next } });
      if (error) {
        logSupabaseError(error, 'updateUser payday_date');
        setPaydayDateState(previous);
      }
    } finally {
      setSaving(false);
    }
  }, [paydayDate]);

  return { paydayDate, setPaydayDate, saving };
}
