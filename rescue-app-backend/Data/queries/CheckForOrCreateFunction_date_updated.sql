-- Ensure the timestamp update trigger function exists
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger is attached to the animals table
DROP TRIGGER IF EXISTS set_timestamp_animals ON public.animals;
CREATE TRIGGER set_timestamp_animals
BEFORE UPDATE ON public.animals
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();


SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'public.animals'::regclass -- Use quotes for "animals" if needed
AND tgname = 'set_timestamp_animals';