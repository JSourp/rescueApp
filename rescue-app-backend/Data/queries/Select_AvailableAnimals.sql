SELECT *
FROM public.animals
WHERE adoption_status IN ('Available','Available - In Foster') -- Spotlight
--WHERE adoption_status IN ('Available','Adoption Pending','Available - In Foster') -- Available Animals
ORDER BY id