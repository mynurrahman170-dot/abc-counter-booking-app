CREATE TABLE public.change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  trip_id uuid,
  field text NOT NULL,
  old_value text,
  new_value text,
  actor_id uuid,
  actor_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.change_log TO authenticated;
GRANT ALL ON public.change_log TO service_role;
ALTER TABLE public.change_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signed in view change log" ON public.change_log FOR SELECT TO authenticated USING (true);
CREATE INDEX change_log_trip_idx ON public.change_log(trip_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_entity_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  aname text;
  tid uuid;
  ov text; nv text;
BEGIN
  SELECT COALESCE(NULLIF(name,''), login_id, email) INTO aname FROM public.profiles WHERE id = auth.uid();
  IF TG_TABLE_NAME = 'trips' THEN tid := NEW.id; ELSE tid := NULL; END IF;

  IF NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id THEN
    SELECT vehicle_number INTO ov FROM public.vehicles WHERE id = OLD.vehicle_id;
    SELECT vehicle_number INTO nv FROM public.vehicles WHERE id = NEW.vehicle_id;
    INSERT INTO public.change_log(entity_type, entity_id, trip_id, field, old_value, new_value, actor_id, actor_name)
    VALUES (TG_TABLE_NAME, NEW.id, tid, 'vehicle', ov, nv, auth.uid(), aname);
  END IF;
  IF NEW.supervisor_id IS DISTINCT FROM OLD.supervisor_id THEN
    SELECT name INTO ov FROM public.supervisors WHERE id = OLD.supervisor_id;
    SELECT name INTO nv FROM public.supervisors WHERE id = NEW.supervisor_id;
    INSERT INTO public.change_log(entity_type, entity_id, trip_id, field, old_value, new_value, actor_id, actor_name)
    VALUES (TG_TABLE_NAME, NEW.id, tid, 'supervisor', ov, nv, auth.uid(), aname);
  END IF;
  IF NEW.departure_time IS DISTINCT FROM OLD.departure_time THEN
    INSERT INTO public.change_log(entity_type, entity_id, trip_id, field, old_value, new_value, actor_id, actor_name)
    VALUES (TG_TABLE_NAME, NEW.id, tid, 'time', left(OLD.departure_time::text,5), left(NEW.departure_time::text,5), auth.uid(), aname);
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.log_entity_changes() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trips_change_log AFTER UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.log_entity_changes();
CREATE TRIGGER schedules_change_log AFTER UPDATE ON public.schedules FOR EACH ROW EXECUTE FUNCTION public.log_entity_changes();