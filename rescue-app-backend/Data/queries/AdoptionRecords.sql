-- Adoption Records
SELECT a.name, a.adoption_status,
	ah.adoption_date, ah.return_date,
	(p.adopter_first_name || ' ' || p.adopter_last_name) AS adopter_name,
	a.current_foster_user_id
FROM public.animals AS a
INNER JOIN public.adoptionhistory AS ah ON a.id = ah.animal_id
INNER JOIN public.adopters AS p ON ah.adopter_id = p.id
WHERE a.id = 33 AND ah.return_date IS NULL