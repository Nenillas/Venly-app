/*
  Periodic expenses: recurrence + original cycle month (anchor).
*/

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['budget_items', 'finance_entries']
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS recurrence text NOT NULL DEFAULT %L',
      t, 'none'
    );
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS recurrence_anchor text',
      t
    );
    EXECUTE format(
      'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I',
      t, t || '_recurrence_check'
    );
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (recurrence IN (%L, %L, %L, %L))',
      t, t || '_recurrence_check', 'none', 'quarterly', 'semiannual', 'annual'
    );
  END LOOP;
END $$;
