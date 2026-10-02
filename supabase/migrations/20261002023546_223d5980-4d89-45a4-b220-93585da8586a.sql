ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS trip_direction text NOT NULL DEFAULT 'up';
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS trip_direction text NOT NULL DEFAULT 'up';