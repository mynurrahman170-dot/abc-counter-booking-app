CREATE OR REPLACE FUNCTION public.validate_seat_selection()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE total int; s text; idx int; taken int; pair_total int;
BEGIN
  IF NEW.status = 'cancelled' THEN RETURN NEW; END IF;
  IF NEW.seat_numbers IS NULL OR array_length(NEW.seat_numbers, 1) IS NULL THEN
    RAISE EXCEPTION 'NO_SEATS_SELECTED';
  END IF;
  IF (SELECT count(DISTINCT x) FROM unnest(NEW.seat_numbers) AS x) <> array_length(NEW.seat_numbers, 1) THEN
    RAISE EXCEPTION 'DUPLICATE_SEATS';
  END IF;
  SELECT t.total_seats INTO total FROM public.trips t WHERE t.id = NEW.trip_id;
  IF total IS NULL THEN RAISE EXCEPTION 'TRIP_NOT_FOUND'; END IF;
  pair_total := total - (total % 2);
  FOREACH s IN ARRAY NEW.seat_numbers LOOP
    IF total IN (44, 46) THEN
      IF s = 'EX-1' THEN CONTINUE; END IF;
      IF total = 44 AND s IN ('H5', 'I5', 'J5') THEN CONTINUE; END IF;
      IF total = 46 AND s = 'K5' THEN CONTINUE; END IF;
      IF s ~ '^[A-Z][1-4]$' THEN
        idx := (ascii(substr(s, 1, 1)) - 65) * 4 + substr(s, 2, 1)::int;
        IF (total = 44 AND idx BETWEEN 1 AND 40) OR (total = 46 AND idx BETWEEN 1 AND 44) THEN CONTINUE; END IF;
      END IF;
      RAISE EXCEPTION 'INVALID_SEAT:%', s;
    END IF;
    IF s = 'EX' THEN
      IF total % 2 = 0 THEN RAISE EXCEPTION 'INVALID_SEAT:%', s; END IF;
      CONTINUE;
    END IF;
    IF s !~ '^[A-Z][1-4]$' THEN RAISE EXCEPTION 'INVALID_SEAT:%', s; END IF;
    idx := (ascii(substr(s, 1, 1)) - 65) * 4 + substr(s, 2, 1)::int;
    IF idx < 1 OR idx > pair_total THEN RAISE EXCEPTION 'INVALID_SEAT:%', s; END IF;
  END LOOP;
  SELECT count(*) INTO taken FROM public.trip_seat_locks l
  WHERE l.trip_id = NEW.trip_id AND l.booking_id <> NEW.id;
  IF taken + array_length(NEW.seat_numbers, 1) > total THEN RAISE EXCEPTION 'TRIP_FULL'; END IF;
  RETURN NEW;
END; $$;