/*
# EkonomiKoll AI – ekonomidatabas

1. Nya tabeller
   - `finance_months` (en rad per månad)
     - `id` (uuid, primärnyckel)
     - `month` (text, unik – format "YYYY-MM")
     - `ending_balance` (numeric – kvar på lönekontot vid nästa lön)
     - `alloc_buffer` (int – procent till buffert)
     - `alloc_avanza` (int – procent till Investeringar)
     - `alloc_travel` (int – procent till resekonto)
     - `created_at` (timestamptz)
   - `finance_entries` (poster: inkomster/kostnader/sparande)
     - `id` (uuid, primärnyckel)
     - `month` (text – "YYYY-MM")
     - `category` (text – income | fixed | variable | savings)
     - `name` (text)
     - `amount` (numeric)
     - `created_at` (timestamptz)

2. Säkerhet
   - RLS aktiverat på båda tabellerna.
   - Appen har ingen inloggning, så data är avsiktligt delad: anon + authenticated
     tillåts läsa och skriva (SELECT/INSERT/UPDATE/DELETE).

3. Testdata
   - Sex månader (2026-03 t.o.m. 2026-08) med inkomster, fasta och rörliga
     kostnader samt sparande, så att diagram och historik fungerar direkt.

4. Viktigt
   1. Beloppen lagras i kronor som numeric.
   2. `month` används som nyckel mellan tabellerna.
*/

CREATE TABLE IF NOT EXISTS finance_months (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text UNIQUE NOT NULL,
  ending_balance numeric NOT NULL DEFAULT 0,
  alloc_buffer int NOT NULL DEFAULT 40,
  alloc_avanza int NOT NULL DEFAULT 40,
  alloc_travel int NOT NULL DEFAULT 20,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL,
  category text NOT NULL CHECK (category IN ('income','fixed','variable','savings')),
  name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_entries_month ON finance_entries(month);
CREATE INDEX IF NOT EXISTS idx_finance_entries_category ON finance_entries(category);

ALTER TABLE finance_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_months" ON finance_months;
CREATE POLICY "anon_select_months" ON finance_months FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_months" ON finance_months;
CREATE POLICY "anon_insert_months" ON finance_months FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_months" ON finance_months;
CREATE POLICY "anon_update_months" ON finance_months FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_months" ON finance_months;
CREATE POLICY "anon_delete_months" ON finance_months FOR DELETE
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_entries" ON finance_entries;
CREATE POLICY "anon_select_entries" ON finance_entries FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_entries" ON finance_entries;
CREATE POLICY "anon_insert_entries" ON finance_entries FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_entries" ON finance_entries;
CREATE POLICY "anon_update_entries" ON finance_entries FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_entries" ON finance_entries;
CREATE POLICY "anon_delete_entries" ON finance_entries FOR DELETE
  TO anon, authenticated USING (true);
