-- Default savings title: Avanza/Nordnet → Investeringar

DO $$
BEGIN
  IF to_regclass('public.budget_items') IS NOT NULL THEN
    UPDATE public.budget_items
    SET name = 'Investeringar'
    WHERE category = 'savings'
      AND lower(btrim(name)) IN ('avanza/nordnet', 'avanza', 'nordnet');
  END IF;

  IF to_regclass('public.finance_entries') IS NOT NULL THEN
    UPDATE public.finance_entries
    SET name = 'Investeringar'
    WHERE category = 'savings'
      AND lower(btrim(name)) IN ('avanza/nordnet', 'avanza', 'nordnet');
  END IF;
END $$;

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
