ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS trip_seq integer NOT NULL DEFAULT 1;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS night_hold boolean NOT NULL DEFAULT false;
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS night_hold boolean NOT NULL DEFAULT false;