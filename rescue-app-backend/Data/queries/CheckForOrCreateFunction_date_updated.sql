-- Ensure the timestamp update trigger function exists
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger is attached to the users table
DROP TRIGGER IF EXISTS set_timestamp_users ON public.users;
CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Check one
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'public.users'::regclass
AND tgname = 'set_timestamp_users';

-- Check all
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname LIKE 'set_timestamp_%';