/*
An Adoption Application is required to finalize an adoption.
In the event a foster adopts, no need for an Adoption Application,
we can use the same data from their Foster Application to create an adoption record.
*/

INSERT INTO public.adoption_applications (
    submission_date,status,which_animal_text,first_name,last_name,spouse_partner_roommate,primary_email,secondary_email,primary_phone,primary_phone_type,secondary_phone,secondary_phone_type,street_address,apt_unit,city,state_province,zip_postal_code,dwelling_type,rent_or_own,landlord_permission,yard_type,adults_in_home,children_in_home,has_allergies,household_aware,has_current_pets,current_pets_details,current_pets_spayed_neutered,current_pets_vaccinations,previous_pets_details,vet_clinic_name,vet_phone,why_adopt,how_heard,waiver_agreed,e_signature_name,waiver_agreement_timestamp,internal_notes,
	-- Handle adoption_applications NOT NULL values
	primary_caregiver,hours_alone_per_day,pet_alone_location,pet_sleep_location,prepared_for_costs
)
SELECT
    NOW(),                                         		-- Automatically set submission_date to today
    'Approved',                                    		-- Automatically approve the application
    '[ENTER ANIMAL NAME HERE]',                    		-- which_animal_text - MANUALLY UPDATE THIS BEFORE RUNNING
	first_name,last_name,spouse_partner_roommate,primary_email,secondary_email,primary_phone,primary_phone_type,secondary_phone,secondary_phone_type,street_address,apt_unit,city,state_province,zip_postal_code,dwelling_type,rent_or_own,landlord_permission,yard_type,adults_in_home,children_in_home,has_allergies,household_aware_foster,has_current_pets,current_pets_details,current_pets_spayed_neutered,current_pets_vaccinations,previous_pets_details,vet_clinic_name,vet_phone,
    'Foster-to-Adopt Conversion',                  		-- Pre-fill the "why_adopt" field
    how_heard,waiver_agreed,e_signature_name,waiver_agreement_timestamp,
    'System generated from Foster Application #' || id,	-- internal_notes
	-- Handle adoption_applications NOT NULL values
	'N/A','N/A','N/A','N/A','N/A'
FROM public.foster_applications
WHERE id = [ENTER FOSTER APP ID HERE];					-- MANUALLY UPDATE THIS BEFORE , pulled from public.foster_applications