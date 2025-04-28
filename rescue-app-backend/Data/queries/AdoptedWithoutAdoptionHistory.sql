SELECT a.name, b.adopter_first_name, ah.*
FROM public.adoptionhistory AS ah
	INNER JOIN public.animals AS a ON ah.animal_id = a.id
	INNER JOIN public.adopters AS b ON ah.adopter_id = b."Id"


SELECT
    a.id,       -- Select the animal's ID
    a.name      -- Select the animal's name
FROM
    public.animals AS a
WHERE
    a.adoption_status = 'Adopted'  -- Only include animals marked as Adopted
    AND NOT EXISTS (               -- And check that there isn't...
        SELECT 1                   -- ...any record...
        FROM public.adoptionhistory AS ah
        WHERE ah.animal_id = a.id  -- ...in adoptionhistory for this animal's ID
    );