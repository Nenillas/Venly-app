/*
  Autogiro-flagga på budgetrader (finance_entries = appens budget_items).
*/
ALTER TABLE finance_entries
  ADD COLUMN IF NOT EXISTS is_autogiro boolean NOT NULL DEFAULT false;
