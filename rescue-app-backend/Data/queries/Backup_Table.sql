-- If taking a fresh backup, drop the previously backed up tables
DROP TABLE IF EXISTS public.dev_adoptionhistory;
DROP TABLE IF EXISTS public.dev_animal_documents;
DROP TABLE IF EXISTS public.dev_adopters;
DROP TABLE IF EXISTS public.dev_animal_images;
DROP TABLE IF EXISTS public.dev_animals;
DROP TABLE IF EXISTS public.dev_users;

-- Create Backups
CREATE TABLE public.dev_adoptionhistory AS SELECT * FROM public.adoptionhistory;
CREATE TABLE public.dev_animal_documents AS SELECT * FROM public.animal_documents;
CREATE TABLE public.dev_adopters AS SELECT * FROM public.adopters;
CREATE TABLE public.dev_animal_images AS SELECT * FROM public.animal_images;
CREATE TABLE public.dev_animals AS SELECT * FROM public.animals;
CREATE TABLE public.dev_users AS SELECT * FROM public.users;

-- Validate backups
SELECT * FROM public.dev_adoptionhistory;
SELECT * FROM public.dev_animal_documents;
SELECT * FROM public.dev_adopters;
SELECT * FROM public.dev_animal_images;
SELECT * FROM public.dev_animals;
SELECT * FROM public.dev_users;

-- Drop Tables
DROP TABLE IF EXISTS public.adoptionhistory;
DROP TABLE IF EXISTS public.animal_documents;
DROP TABLE IF EXISTS public.adopters;
DROP TABLE IF EXISTS public.animal_images;
DROP TABLE IF EXISTS public.animals;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public."__EFMigrationsHistory";

-- Run "dotnet ef ..." commands

-- Restore from backup
INSERT INTO public.users SELECT * FROM public.dev_users;
INSERT INTO public.animals SELECT * FROM public.dev_animals;
INSERT INTO public.animal_images SELECT * FROM public.dev_animal_images;
INSERT INTO public.adopters SELECT * FROM public.dev_adopters;
INSERT INTO public.animal_documents SELECT * FROM public.dev_animal_documents;
INSERT INTO public.adoptionhistory SELECT * FROM public.dev_adoptionhistory;

-- Reset sequence
SELECT setval('public.animals_id_seq', COALESCE((SELECT MAX(id) FROM public.animals), 1));
SELECT setval('public.animal_images_id_seq', COALESCE((SELECT MAX(id) FROM public.animal_images), 1));
SELECT setval('public.adopters_id_seq', COALESCE((SELECT MAX(id) FROM public.adopters), 1));
SELECT setval('public.adoptionhistory_id_seq', COALESCE((SELECT MAX(id) FROM public.adoptionhistory), 1));

-- Validate new tables
SELECT * FROM public.adoptionhistory;
SELECT * FROM public.animal_documents;
SELECT * FROM public.adopters;
SELECT * FROM public.animal_images;
SELECT * FROM public.animals;
SELECT * FROM public.users;

--ALTER TABLE public.adopters
--ALTER COLUMN date_updated SET DEFAULT CURRENT_TIMESTAMP;
