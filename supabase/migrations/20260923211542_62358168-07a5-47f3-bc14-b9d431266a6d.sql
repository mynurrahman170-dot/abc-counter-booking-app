ALTER TABLE public.trip_seat_locks ADD COLUMN IF NOT EXISTS booking_point_id uuid;
UPDATE public.trip_seat_locks l SET booking_point_id = b.booking_point_id FROM public.seat_bookings b WHERE b.id = l.booking_id;
CREATE OR REPLACE FUNCTION public.sync_seat_locks()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE s text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.trip_seat_locks WHERE booking_id = OLD.id;
    RETURN OLD;
  END IF;
  DELETE FROM public.trip_seat_locks WHERE booking_id = NEW.id;
  IF NEW.status <> 'cancelled' THEN
    FOREACH s IN ARRAY COALESCE(NEW.seat_numbers, '{}'::text[]) LOOP
      BEGIN
        INSERT INTO public.trip_seat_locks (trip_id, seat_number, booking_id, booking_point_id)
        VALUES (NEW.trip_id, s, NEW.id, NEW.booking_point_id);
      EXCEPTION WHEN unique_violation THEN
        RAISE EXCEPTION 'SEAT_TAKEN:%', s;
      END;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;