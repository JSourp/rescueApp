-- Animals that have been Adopted but do not have a AdoptionHistory record
SELECT
    a.id,          -- Select the animal's ID
    a.name,         -- Select the animal's name
	a.date_created -- Select the date that the animal record was created
FROM
    public.animals AS a
WHERE
    a.adoption_status = 'Adopted'  -- Only include animals marked as Adopted
    AND NOT EXISTS (               -- And check that there isn't...
        SELECT 1                   -- ...any record...
        FROM public.adoptionhistory AS ah
        WHERE ah.animal_id = a.id  -- ...in adoptionhistory for this animal's ID
    )
ORDER BY a.date_created ASC;