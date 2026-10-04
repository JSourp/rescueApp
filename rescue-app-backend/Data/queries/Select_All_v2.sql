SELECT * FROM public.adoption_applications WHERE which_animal_text = 'Mimosa' --AND first_name = 'Marilyn';
SELECT * FROM public.adoption_applications WHERE status = 'Approved' ORDER BY submission_date DESC;
SELECT * FROM public.partnership_sponsorship_applications;
SELECT * FROM public.volunteer_applications;
SELECT * FROM public.foster_profiles;
SELECT * FROM public.foster_applications;
SELECT * FROM public.adoptionhistory;
SELECT * FROM public.animal_documents;
SELECT * FROM public.adopters;
SELECT * FROM public.animal_images;
SELECT * FROM public.animals ORDER BY date_created DESC;
SELECT * FROM public.animals WHERE adoption_status = 'Adopted' ORDER BY date_updated DESC;
SELECT * FROM public.users;


-- Graduates and Adopted count - should match if everything is flowing properly
SELECT 
    COUNT(DISTINCT CASE WHEN h.return_date IS NULL AND h.id IS NOT NULL THEN a.id END) AS GraduateCount,
    COUNT(DISTINCT a.id) AS AdoptedCount
FROM public.animals AS a
LEFT JOIN public.adoptionhistory AS h ON a.id = h.animal_id
WHERE a.adoption_status = 'Adopted';


SELECT f.*
FROM public.foster_applications AS f
	INNER JOIN public.foster_profiles AS fp ON f.id = fp.foster_application_id
WHERE fp.is_active_foster

-- AdopterData - Used for Adopted email list
SELECT
	animals.name AS "Animal Name",
	adopters.adopter_first_name || ' ' || adopters.adopter_last_name AS "Adopter Name",
	adopters.adopter_email AS "Adopter Email",
	adopters.adopter_primary_phone AS "Adopter Phone",
	TO_CHAR(adoptionhistory.adoption_date, 'MM/DD/YYYY') AS "Adoption Date",
	adoptionhistory.notes
FROM public.adoptionhistory AS adoptionhistory
	INNER JOIN public.adopters AS adopters ON adoptionhistory.adopter_id = adopters.id
	INNER JOIN public.animals AS animals ON adoptionhistory.animal_id = animals.id
WHERE adopters.adopter_last_name NOT IN ('Sourp')
ORDER BY adoptionhistory.adoption_date DESC;

