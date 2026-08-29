-- monthly_records surplus allocation columns
-- Categories in the app: SAVINGS_BUCKETS → buffer, investments, travel
-- (alloc_buffer, alloc_avanza, alloc_travel). alloc_avanza is the Investeringar share.

ALTER TABLE public.monthly_records
  ADD COLUMN IF NOT EXISTS alloc_buffer NUMERIC DEFAULT 0;

ALTER TABLE public.monthly_records
  ADD COLUMN IF NOT EXISTS alloc_avanza NUMERIC DEFAULT 0;

ALTER TABLE public.monthly_records
  ADD COLUMN IF NOT EXISTS alloc_travel NUMERIC DEFAULT 0;

NOTIFY pgrst, 'reload schema';
