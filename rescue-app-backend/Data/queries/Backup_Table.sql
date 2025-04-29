-- If taking a fresh backup, drop the previously backed up tables
DROP TABLE IF EXISTS public.animals_dev;

-- Create Backup
CREATE TABLE public.animals_dev AS
SELECT *
FROM public.animals_dev;

-- Validate backups
SELECT * FROM public.users_dev;
SELECT * FROM public.animals_dev;

-- Drop Tables
DROP TABLE IF EXISTS public.adoptionhistory;
DROP TABLE IF EXISTS public.adopters;
DROP TABLE IF EXISTS public.animals;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public."__EFMigrationsHistory";

-- Restore from backup
INSERT INTO public.animals SELECT * FROM public.animals_dev;
INSERT INTO public.users SELECT * FROM public.users_dev;

-- Validate new tables
SELECT * FROM public.adoptionhistory;
SELECT * FROM public.users;
SELECT * FROM public.adopters;
SELECT * FROM public.animals;

ALTER TABLE public.adopters
ALTER COLUMN date_updated SET DEFAULT CURRENT_TIMESTAMP;
