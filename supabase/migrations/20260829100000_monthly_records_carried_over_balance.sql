-- Persist leftover salary after Verkställ (ending_balance is cleared on apply).

ALTER TABLE public.monthly_records
  ADD COLUMN IF NOT EXISTS carried_over_balance NUMERIC DEFAULT 0;

ALTER TABLE IF EXISTS public.finance_months
  ADD COLUMN IF NOT EXISTS carried_over_balance NUMERIC DEFAULT 0;

NOTIFY pgrst, 'reload schema';
