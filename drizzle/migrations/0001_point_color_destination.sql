ALTER TABLE public.booking_points ADD COLUMN IF NOT EXISTS seat_color text;
ALTER TABLE public.seat_bookings ADD COLUMN IF NOT EXISTS destination text;