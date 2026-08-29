/*
  Användarisolering: varje rad tillhör en inloggad användare.
  RLS ersätter de öppna anon-policyerna.
*/

ALTER TABLE finance_months
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE finance_entries
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE finance_months
  DROP CONSTRAINT IF EXISTS finance_months_month_key;

DROP INDEX IF EXISTS finance_months_month_key;

ALTER TABLE finance_months
  DROP CONSTRAINT IF EXISTS finance_months_user_month_key;

ALTER TABLE finance_months
  ADD CONSTRAINT finance_months_user_month_key UNIQUE (user_id, month);

CREATE INDEX IF NOT EXISTS idx_finance_months_user ON finance_months(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_entries_user ON finance_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_entries_user_month ON finance_entries(user_id, month);

DROP POLICY IF EXISTS "anon_select_months" ON finance_months;
DROP POLICY IF EXISTS "anon_insert_months" ON finance_months;
DROP POLICY IF EXISTS "anon_update_months" ON finance_months;
DROP POLICY IF EXISTS "anon_delete_months" ON finance_months;
DROP POLICY IF EXISTS "anon_select_entries" ON finance_entries;
DROP POLICY IF EXISTS "anon_insert_entries" ON finance_entries;
DROP POLICY IF EXISTS "anon_update_entries" ON finance_entries;
DROP POLICY IF EXISTS "anon_delete_entries" ON finance_entries;

DROP POLICY IF EXISTS "users_select_own_months" ON finance_months;
CREATE POLICY "users_select_own_months" ON finance_months FOR SELECT
  TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "users_insert_own_months" ON finance_months;
CREATE POLICY "users_insert_own_months" ON finance_months FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "users_update_own_months" ON finance_months;
CREATE POLICY "users_update_own_months" ON finance_months FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "users_delete_own_months" ON finance_months;
CREATE POLICY "users_delete_own_months" ON finance_months FOR DELETE
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_select_own_entries" ON finance_entries;
CREATE POLICY "users_select_own_entries" ON finance_entries FOR SELECT
  TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "users_insert_own_entries" ON finance_entries;
CREATE POLICY "users_insert_own_entries" ON finance_entries FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "users_update_own_entries" ON finance_entries;
CREATE POLICY "users_update_own_entries" ON finance_entries FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "users_delete_own_entries" ON finance_entries;
CREATE POLICY "users_delete_own_entries" ON finance_entries FOR DELETE
  TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_row_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_finance_months_user_id ON finance_months;
CREATE TRIGGER set_finance_months_user_id
  BEFORE INSERT ON finance_months
  FOR EACH ROW EXECUTE FUNCTION public.set_row_user_id();

DROP TRIGGER IF EXISTS set_finance_entries_user_id ON finance_entries;
CREATE TRIGGER set_finance_entries_user_id
  BEFORE INSERT ON finance_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_row_user_id();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m text := to_char((now() AT TIME ZONE 'Europe/Stockholm'), 'YYYY-MM');
BEGIN
  INSERT INTO public.finance_months (user_id, month)
  VALUES (NEW.id, m)
  ON CONFLICT (user_id, month) DO NOTHING;

  INSERT INTO public.finance_entries (user_id, month, category, name, amount)
  VALUES
    (NEW.id, m, 'savings', 'Buffert', 0),
    (NEW.id, m, 'savings', 'Investeringar', 0),
    (NEW.id, m, 'savings', 'Resekonto', 0);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
