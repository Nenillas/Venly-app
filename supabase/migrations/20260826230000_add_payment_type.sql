/*
  Betaltyp på budgetrader (finance_entries = appens budget_items).
*/
ALTER TABLE finance_entries
  ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'invoice';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'finance_entries'
      AND column_name = 'is_autogiro'
  ) THEN
    UPDATE finance_entries
    SET payment_type = 'autogiro'
    WHERE is_autogiro = true
      AND payment_type = 'invoice';
  END IF;
END $$;

ALTER TABLE finance_entries
  DROP CONSTRAINT IF EXISTS finance_entries_payment_type_check;

ALTER TABLE finance_entries
  ADD CONSTRAINT finance_entries_payment_type_check
  CHECK (payment_type IN ('invoice', 'autogiro', 'card_pot'));
