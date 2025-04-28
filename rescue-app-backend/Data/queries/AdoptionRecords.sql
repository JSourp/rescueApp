-- Adoption Records
SELECT a.name, b.adopter_first_name, ah.*
FROM public.adoptionhistory AS ah
	INNER JOIN public.animals AS a ON ah.animal_id = a.id
	INNER JOIN public.adopters AS b ON ah.adopter_id = b.id