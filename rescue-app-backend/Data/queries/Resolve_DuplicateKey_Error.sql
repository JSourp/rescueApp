-- Resolved "duplicate key" errors
-- The error message 23505: duplicate key value violates unique constraint "PK_animals" after dropping/recreating tables 
-- and potentially restoring data is the classic symptom of the underlying PostgreSQL sequence for the animals.id column being 
-- out of sync with the data currently in the table.

-- Find the Maximum Existing ID: See what the highest id currently is in your animals table.
SELECT max(id) FROM public.animals; --22

-- Check the Sequence's Current Value: See what value the sequence thinks it generated last.
SELECT last_value FROM public.animals_id_seq; --1

-- If those numbers don't match, then we need to reset the sequence.
-- Sets the sequence so the NEXT generated ID will be max(id) + 1
-- COALESCE handles the case where the table might be empty (starts from 1)
SELECT setval('public.animals_id_seq', COALESCE((SELECT MAX(id) FROM public.animals), 1));

-- Now the first two queries should return the same number.