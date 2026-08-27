/*
  Add `paid` on finance_entries so bill checklist status persists.
*/
ALTER TABLE finance_entries
  ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT false;
