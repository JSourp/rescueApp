"use client";
import React, { useState } from 'react';
import { useForm, SubmitHandler } from "react-hook-form";
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { InformationCircleIcon, SuccessCheckmarkIcon } from "@/components/Icons";

const FOSTER_WAIVER_TEXT = `
Foster Parent Agreement and Waiver of Liability

I, the undersigned, wish to provide temporary foster care for an animal(s) from Second Chance Animal Rescue & Sanctuary ("SCARS").
In consideration of being allowed to foster an animal, I agree to the following terms and conditions:

1. Care of Animal: I will provide the foster animal(s) with humane care, including adequate food, water, shelter, and exercise,
   and will follow all specific care instructions provided by SCARS.
2. Veterinary Care: All veterinary care must be authorized by SCARS prior to treatment, except in cases of extreme emergency.
   SCARS will be responsible for pre-approved veterinary expenses.
3. Safety: I will keep the foster animal(s) in a safe and secure environment, and will not allow them to roam freely.
   I will take all necessary precautions to prevent escape, injury, or illness.
4. Return of Animal: I understand that the foster animal(s) remain the property of SCARS and I agree to return them to SCARS
   upon request, or when a permanent adoptive home is found.
5. Liability: I understand that animals can be unpredictable and may bite, scratch, or cause other injury or damage.
   I agree to assume all risks associated with fostering an animal and release SCARS, its volunteers, employees, and agents
   from any and all liability for any injury, illness, damage, or loss I or my property may sustain as a result of fostering.
   This includes, but is not limited to, injuries or damages caused by the foster animal(s) to myself, members of my household,
   my own pets, or any third parties or their property.
6. Indemnification: I agree to indemnify and hold harmless SCARS from any claims, damages, costs, or expenses (including
   attorney's fees) arising out of or related to my foster care activities.

I have read this agreement carefully and fully understand its terms. I sign this agreement voluntarily and with full knowledge of its significance.
`;

// Define the shape of your foster form data
interface FosterFormData {
	// Applicant Information
	first_name: string;
	last_name: string;
	spouse_partner_roommate?: string;
	street_address: string;
	apt_unit?: string;
	city: string;
	state_province: string;
	zip_postal_code: string;
	primary_phone: string;
	primary_phone_type: 'Cell' | 'Home' | 'Work' | '';
	secondary_phone?: string;
	secondary_phone_type?: 'Cell' | 'Home' | 'Work' | '';
	primary_email: string;
	secondary_email?: string;
	how_heard?: string;

	// Household & Home Environment
	adults_in_home: string;
	children_in_home?: string;
	has_allergies?: 'Yes' | 'No' | 'Unsure' | '';
	household_aware_foster: 'Yes' | 'No' | '';
	dwelling_type: 'House' | 'Apartment' | 'Condo/Townhouse' | 'Mobile Home' | 'Other' | '';
	rent_or_own: 'Rent' | 'Own' | '';
	landlord_permission?: boolean;
	yard_type?: 'Fenced' | 'Unfenced' | 'Patio/Balcony Only' | 'None' | '';
	separation_plan: string;

	// Current Pet Information
	has_current_pets: 'Yes' | 'No' | '';
	current_pets_details?: string;
	current_pets_spayed_neutered?: 'Yes' | 'No' | 'Some' | 'N/A' | '';
	current_pets_vaccinations?: 'Yes' | 'No' | 'N/A' | '';
	vet_clinic_name?: string;
	vet_phone?: string;

	// Foster Experience & Preferences
	has_fostered_before: 'Yes' | 'No' | '';
	previous_foster_details?: string;
	why_foster: string;
	foster_animal_types: string[];
	willing_medical: 'Yes' | 'No' | 'Maybe' | '';
	willing_behavioral: 'Yes' | 'No' | 'Maybe' | '';
	commitment_length: 'Short-term (<1 month)' | 'Medium-term (1-3 months)' | 'Longer-term (3+ months)' | 'Flexible' | '';
	can_transport: 'Yes' | 'No' | 'Maybe' | '';
	previous_pets_details?: string;
	transport_explanation?: string;

	// Waiver
	waiver_agreed: boolean;
	e_signature_name: string;

	// Submission related
	subject: string;
	botcheck?: string;
}

const TooltipButton = ({ content, label }: { content: string, label: string }) => (
	<Tippy content={content} placement="top" animation="shift-away-subtle">
		<button type="button" aria-label={label} className="ml-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none align-middle">
			<InformationCircleIcon />
		</button>
	</Tippy>
);

interface FosterFormProps {
	onClose: () => void;
}

export default function FosterForm({ onClose }: FosterFormProps) {
	const defaultSubject = `Foster Application`; // Generic subject for foster

	const {
		register,
		handleSubmit,
		reset,
		watch,
		formState: { errors, isSubmitting },
	} = useForm<FosterFormData>({
		mode: "onTouched",
		defaultValues: { // Set defaults for all fields needing one
			subject: defaultSubject,
			primary_phone_type: '', secondary_phone_type: '', has_allergies: '',
			household_aware_foster: '', dwelling_type: '', rent_or_own: '',
			landlord_permission: false, yard_type: '', has_current_pets: '',
			current_pets_spayed_neutered: '', current_pets_vaccinations: '',
			has_fostered_before: '', willing_medical: '', willing_behavioral: '',
			commitment_length: '', can_transport: '', foster_animal_types: [],
			waiver_agreed: false,
			e_signature_name: '',
		}
	});

	// Watch values for conditional rendering
	const rentOrOwnValue = watch("rent_or_own");
	const hasCurrentPetsValue = watch("has_current_pets");
	const hasFosteredBeforeValue = watch("has_fostered_before");

	const [isSuccess, setIsSuccess] = useState(false);
	const [submitMessage, setSubmitMessage] = useState("");

	const onSubmit = async (data: FosterFormData) => {
		setIsSuccess(false);
		setSubmitMessage("");
		console.log("Foster Form Data:", data);

		// Basic check for landlord permission if renting
		if (data.rent_or_own === 'Rent' && !data.landlord_permission) {
			setSubmitMessage("Please confirm you have landlord permission if you are renting.");
			return;
		}
		// Check that at least one animal type is selected
		if (!data.foster_animal_types || data.foster_animal_types.length === 0) {
			setSubmitMessage("Please select at least one type of animal you are interested in fostering.");
			return; // Or set focus to the field
		}

		// --- Client-side validation for waiver ---
		if (!data.waiver_agreed) {
			setSubmitMessage("You must agree to the waiver terms to submit the application.");
			document.getElementById("waiver_agreed")?.focus();
			return;
		}
		if (data.waiver_agreed && (!data.e_signature_name || data.e_signature_name.trim() === '')) {
			setSubmitMessage("Please type your full name as your electronic signature to agree to the waiver.");
			document.getElementById("e_signature_name")?.focus();
			return;
		}

		try {
			if (data.botcheck) {
				console.warn("Bot submission detected. Ignoring.");
				setSubmitMessage("Submission ignored due to bot detection.");
				return;
			}

			const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
			if (!apiBaseUrl) {
				throw new Error("API base URL is not configured.");
			}

			// --- Step 1: Save application to the database ---
			// Map snake_case FosterFormData to camelCase for the backend DTO
			const dbPayload = {
				// Applicant Information
				firstName: data.first_name,
				lastName: data.last_name,
				spousePartnerRoommate: data.spouse_partner_roommate,
				streetAddress: data.street_address,
				aptUnit: data.apt_unit,
				city: data.city,
				stateProvince: data.state_province,
				zipPostalCode: data.zip_postal_code,
				primaryPhone: data.primary_phone,
				primaryPhoneType: data.primary_phone_type,
				secondaryPhone: data.secondary_phone,
				secondaryPhoneType: data.secondary_phone_type,
				primaryEmail: data.primary_email,
				secondaryEmail: data.secondary_email,
				howHeard: data.how_heard,

				// Household & Home Environment
				adultsInHome: data.adults_in_home,
				childrenInHome: data.children_in_home,
				hasAllergies: data.has_allergies,
				householdAwareFoster: data.household_aware_foster,
				dwellingType: data.dwelling_type,
				rentOrOwn: data.rent_or_own,
				landlordPermission: data.landlord_permission,
				yardType: data.yard_type,
				separationPlan: data.separation_plan,

				// Current Pet Information
				hasCurrentPets: data.has_current_pets,
				currentPetsDetails: data.current_pets_details,
				currentPetsSpayedNeutered: data.current_pets_spayed_neutered,
				currentPetsVaccinations: data.current_pets_vaccinations,
				vetClinicName: data.vet_clinic_name,
				vetPhone: data.vet_phone,

				// Foster Experience & Preferences
				hasFosteredBefore: data.has_fostered_before,
				previousFosterDetails: data.previous_foster_details,
				whyFoster: data.why_foster,
				fosterAnimalTypes: data.foster_animal_types?.join(', '), // Join array to string
				willingMedical: data.willing_medical,
				willingBehavioral: data.willing_behavioral,
				commitmentLength: data.commitment_length,
				canTransport: data.can_transport,
				transportExplanation: data.transport_explanation,
				previousPetsDetails: data.previous_pets_details,

				// Waiver
				waiverAgreed: data.waiver_agreed,
				eSignatureName: data.e_signature_name,
			};

			console.log("Submitting Foster Application to backend:", dbPayload);

			const dbResponse = await fetch(`${apiBaseUrl}/foster-applications`, { // New endpoint
				method: "POST",
				headers: { "Content-Type": "application/json" }, // No Auth token for public submission
				body: JSON.stringify(dbPayload), // Send camelCase payload
			});

			const dbResult = await dbResponse.json(); // Get dbResponse body

			if (!dbResponse.ok) {
				throw new Error(dbResult.error?.message || dbResult.message || "Failed to submit application to our database.");
			}
			console.log("Application successfully saved to database:", dbResult);

			// --- Step 2: Send email notification via Web3Forms (only if DB save was successful) ---
			try {
				const web3formsPayload = {
					...data, // Send original snake_case form data to web3forms
					foster_animal_types: data.foster_animal_types?.join(', '), // Ensure array is stringified
					waiver_agreed: data.waiver_agreed ? 'Yes' : 'No',
					e_signature_name: data.e_signature_name,
					access_key: process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY,
					from_name: "Rescue App Foster Application", // Customize as needed
					subject: `New Foster Application: ${data.first_name} ${data.last_name}`, // More specific subject
					botcheck: undefined, // Remove honeypot data from email payload
				};

				console.log("Sending notification email via web3forms...");
				const emailResponse = await fetch("https://api.web3forms.com/submit", {
					method: "POST",
					headers: { "Content-Type": "application/json", Accept: "application/json" },
					body: JSON.stringify(web3formsPayload),
				});

				const emailResult = await emailResponse.json();
				if (emailResult.success) {
					console.log("Notification email sent successfully via web3forms.");
				} else {
					// Log the error but don't overwrite the primary success message for the user
					console.error("Failed to send notification email via web3forms:", emailResult.message || "Unknown web3forms error");
					// Optionally, you could inform admins through another channel if email fails
				}
			} catch (emailError) {
				// Log the error but don't overwrite the primary success message
				console.error("Error sending notification email via web3forms:", emailError);
			}

			// --- Overall Success (based on DB save) ---
			setIsSuccess(true);
			setSubmitMessage("Thank you! Your foster application has been submitted. Our foster coordinator will be in touch soon!");
			reset(); // Reset form fields

			setTimeout(() => {
				onClose();
			}, 3000);
		} catch (error: any) {
			setIsSuccess(false);
			setSubmitMessage(error.message || "An unexpected error occurred. Please try again.");
			console.error("Form Submission Error:", error);
		}
	};

	// --- Base styling classes
	const inputBaseClasses = "w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-gray-100 dark:focus:ring-gray-900 focus:border-gray-500 dark:focus:border-gray-500";
	const inputBorderClasses = (hasError: boolean) => hasError ? 'border-red-500 dark:border-red-600' : 'border-gray-300 dark:border-gray-600';
	const errorTextClasses = "text-red-500 dark:text-red-400 text-xs mt-1";
	const labelBaseClasses = "block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300";
	const sectionTitleClasses = "text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200 flex items-center";
	const subSectionTitleClasses = "text-md font-medium mt-4 mb-2 text-gray-700 dark:text-gray-300 flex items-center";
	const radioLabelClasses = "ml-2 text-sm text-gray-700 dark:text-gray-300";
	const radioInputClasses = "form-radio h-4 w-4 text-gray-600 dark:bg-gray-700 border-gray-300 dark:border-gray-600";
	const checkboxLabelClasses = "ml-2 text-sm text-gray-700 dark:text-gray-300";
	const checkboxInputClasses = "form-checkbox h-4 w-4 text-gray-600 border-gray-300 dark:border-gray-600 rounded focus:ring-gray-500 dark:bg-gray-700";

	return (
		<div className="flex flex-col max-h-[85vh]">
			{/* Header */}
			<div className="flex-shrink-0 p-5 bg-gray-500 dark:bg-gray-600">
				<h3 className="text-lg text-white text-center font-semibold">
					Foster Application
				</h3>
			</div>

			{/* Form Area - Scrollable */}
			<div className="flex-grow p-6 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
				{!isSuccess ? (
					<form onSubmit={handleSubmit(onSubmit)} noValidate>
						{/* Honeypot & Hidden Subject */}
						<input type="checkbox" className="hidden" style={{ display: "none" }} {...register("botcheck")} />
						<input type="hidden" {...register("subject")} />

						{/* --- Contact Info Section --- */}
						<h4 className={sectionTitleClasses}>
							Applicant Information
							<TooltipButton content="Basic contact details allow us to follow up on your application." label="More info about applicant information" />
						</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
							{/* First Name */}
							<div>
								<label htmlFor="first_name" className={labelBaseClasses}>First Name *</label>
								<input type="text" id="first_name" {...register("first_name", { required: "First name is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.first_name)}`} />
								{errors.first_name && <p className={errorTextClasses}>{errors.first_name.message}</p>}
							</div>
							{/* Last Name */}
							<div>
								<label htmlFor="last_name" className={labelBaseClasses}>Last Name *</label>
								<input type="text" id="last_name" {...register("last_name", { required: "Last name is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.last_name)}`} />
								{errors.last_name && <p className={errorTextClasses}>{errors.last_name.message}</p>}
							</div>
						</div>
						{/* Spouse/Partner (Optional) */}
						<div className="mb-4">
							<label htmlFor="spouse_partner_roommate" className={labelBaseClasses}>Spouse / Partner / Roommate Name(s) (Optional)</label>
							<input type="text" id="spouse_partner_roommate" {...register("spouse_partner_roommate")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.spouse_partner_roommate)}`} />
						</div>
						{/* Primary Email */}
						<div className="mb-4">
							<label htmlFor="primary_email" className={labelBaseClasses}>Primary Email *</label>
							<input type="email" id="primary_email" {...register("primary_email", { required: "Email is required", pattern: { value: /^\S+@\S+$/i, message: "Invalid email format" } })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.primary_email)}`} />
							{errors.primary_email && <p className={errorTextClasses}>{errors.primary_email.message}</p>}
						</div>
						{/* Secondary Email (Optional, skip validation) */}
						<div className="mb-4">
							<label htmlFor="secondary_email" className={labelBaseClasses}>Secondary Email (Optional)</label>
							<input type="email" id="secondary_email" className={`${inputBaseClasses}`} />
						</div>
						{/* Primary Phone */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
							<div>
								<label htmlFor="primary_phone" className={labelBaseClasses}>Primary Phone *</label>
								<input type="tel" id="primary_phone" {...register("primary_phone", { required: "Primary phone is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.primary_phone)}`} />
								{errors.primary_phone && <p className={errorTextClasses}>{errors.primary_phone.message}</p>}
							</div>
							<div>
								<label htmlFor="primary_phone_type" className={labelBaseClasses}>Primary Phone Type *</label>
								<select id="primary_phone_type" {...register("primary_phone_type", { required: "Select phone type" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.primary_phone_type)}`}>
									<option value="">Select Type...</option>
									<option value="Cell">Cell</option>
									<option value="Home">Home</option>
									<option value="Work">Work</option>
								</select>
								{errors.primary_phone_type && <p className={errorTextClasses}>{errors.primary_phone_type.message}</p>}
							</div>
						</div>
						{/* Secondary Phone (Optional) */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
							<div>
								<label htmlFor="secondary_phone" className={labelBaseClasses}>Secondary Phone (Optional)</label>
								<input type="tel" id="secondary_phone" {...register("secondary_phone")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.secondary_phone)}`} />
							</div>
							<div>
								<label htmlFor="secondary_phone_type" className={labelBaseClasses}>Secondary Phone Type</label>
								<select id="secondary_phone_type" {...register("secondary_phone_type")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.secondary_phone_type)}`}>
									<option value="">Select Type...</option>
									<option value="Cell">Cell</option>
									<option value="Home">Home</option>
									<option value="Work">Work</option>
								</select>
							</div>
						</div>

						{/* --- Household & Home Environment Section --- */}
						<hr className="my-6 border-gray-300 dark:border-gray-600" />
						<h4 className={sectionTitleClasses}>
							Home & Household
							<TooltipButton content="Helps us understand the potential foster environment to ensure it's safe and suitable for temporary care." label="More info about home and household questions" />
						</h4>
						{/* Street Address */}
						<div className="mb-4">
							<label htmlFor="street_address" className={labelBaseClasses}>Street Address *</label>
							<input type="text" id="street_address" {...register("street_address", { required: "Street address is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.street_address)}`} />
							{errors.street_address && <p className={errorTextClasses}>{errors.street_address.message}</p>}
						</div>
						{/* Apt/Unit (Optional) */}
						<div className="mb-4">
							<label htmlFor="apt_unit" className={labelBaseClasses}>Apt/Unit # (Optional)</label>
							<input type="text" id="apt_unit" {...register("apt_unit")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.apt_unit)}`} />
						</div>
						{/* City/State/Zip */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
							<div>
								<label htmlFor="city" className={labelBaseClasses}>City *</label>
								<input type="text" id="city" {...register("city", { required: "City is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.city)}`} />
								{errors.city && <p className={errorTextClasses}>{errors.city.message}</p>}
							</div>
							<div>
								<label htmlFor="state_province" className={labelBaseClasses}>State/Province *</label>
								{/* Consider a dropdown for state if only serving specific areas */}
								<input type="text" id="state_province" {...register("state_province", { required: "State/Province is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.state_province)}`} />
								{errors.state_province && <p className={errorTextClasses}>{errors.state_province.message}</p>}
							</div>
							<div>
								<label htmlFor="zip_postal_code" className={labelBaseClasses}>Zip/Postal Code *</label>
								<input type="text" id="zip_postal_code" {...register("zip_postal_code", { required: "Zip/Postal Code is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.zip_postal_code)}`} />
								{errors.zip_postal_code && <p className={errorTextClasses}>{errors.zip_postal_code.message}</p>}
							</div>
						</div>
						{/* Dwelling Type */}
						<div className="mb-4">
							<label htmlFor="dwelling_type" className={labelBaseClasses}>Type of Dwelling *</label>
							<select id="dwelling_type" {...register("dwelling_type", { required: "Please select dwelling type" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.dwelling_type)}`}>
								<option value="">Select...</option>
								<option value="House">House</option>
								<option value="Apartment">Apartment</option>
								<option value="Condo/Townhouse">Condo/Townhouse</option>
								<option value="Mobile Home">Mobile Home</option>
								<option value="Other">Other</option>
							</select>
							{errors.dwelling_type && <p className={errorTextClasses}>{errors.dwelling_type.message}</p>}
						</div>
						{/* Rent or Own */}
						<div className="mb-4">
							<label className={labelBaseClasses}>Do you Rent or Own? *</label>
							<div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
								<label className="inline-flex items-center">
									<input type="radio" value="Rent" {...register("rent_or_own", { required: "Please select Rent or Own" })} className={radioInputClasses} />
									<span className={radioLabelClasses}>Rent</span>
								</label>
								<label className="inline-flex items-center">
									<input type="radio" value="Own" {...register("rent_or_own", { required: "Please select Rent or Own" })} className={radioInputClasses} />
									<span className={radioLabelClasses}>Own</span>
								</label>
							</div>
							{errors.rent_or_own && <p className={errorTextClasses}>{errors.rent_or_own.message}</p>}
						</div>
						{/* Conditional Landlord Permission */}
						{rentOrOwnValue === 'Rent' && (
							<div className="mb-4 p-3 bg-blue-50 dark:bg-gray-700 border-l-4 border-blue-500 dark:border-blue-400 rounded-r-md">
								<label className={`${labelBaseClasses} flex items-center cursor-pointer`}>
									<input type="checkbox" id="landlord_permission" {...register("landlord_permission", { required: "Landlord permission is required if renting" })} className={`form-checkbox h-5 w-5 text-gray-600 dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded mr-2 ${errors.landlord_permission ? 'border-red-500 dark:border-red-600' : ''}`} />
									<span className={checkboxLabelClasses}>I confirm I have my landlord&apos;s permission for a pet of this type/size.</span>
								</label>
								<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">We may need to verify this with your landlord later in the process.</p>
								{errors.landlord_permission && <p className={errorTextClasses}>{errors.landlord_permission.message}</p>}
							</div>
						)}
						{/* Yard Type */}
						<div className="mb-4">
							<label htmlFor="yard_type" className={labelBaseClasses}>Yard Type (If applicable)</label>
							<select id="yard_type" {...register("yard_type")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.yard_type)}`}>
								<option value="">Select...</option>
								<option value="Fenced">Fenced Yard</option>
								<option value="Unfenced">Unfenced Yard</option>
								<option value="Patio/Balcony Only">Patio/Balcony Only</option>
								<option value="None">No Yard/Access</option>
							</select>
						</div>
						{/* Adults & Children */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
							<div>
								<label htmlFor="adults_in_home" className={labelBaseClasses}>Number of Adults in Household (18+)? *</label>
								<input type="number" min="1" step="1" id="adults_in_home" {...register("adults_in_home", { required: "Number of adults is required", min: { value: 1, message: "Must be at least 1 adult" } })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adults_in_home)}`} />
								{errors.adults_in_home && <p className={errorTextClasses}>{errors.adults_in_home.message}</p>}
							</div>
							<div>
								<label htmlFor="children_in_home" className={labelBaseClasses}>Number & Ages of Children (&lt;18)?</label>
								<input type="text" id="children_in_home" {...register("children_in_home")} placeholder="e.g., 1 child, age 8" className={`${inputBaseClasses} ${inputBorderClasses(!!errors.children_in_home)}`} />
								{/* Optional: Add validation if needed */}
							</div>
						</div>
						{/* Allergies */}
						<div className="mb-4">
							<label className={labelBaseClasses}>Does anyone in the home have known pet allergies? *</label>
							<div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
								<label className="inline-flex items-center">
									<input type="radio" value="Yes" {...register("has_allergies", { required: "Please select an option" })} className={radioInputClasses} />
									<span className={radioLabelClasses}>Yes</span>
								</label>
								<label className="inline-flex items-center">
									<input type="radio" value="No" {...register("has_allergies", { required: "Please select an option" })} className={radioInputClasses} />
									<span className={radioLabelClasses}>No</span>
								</label>
								<label className="inline-flex items-center">
									<input type="radio" value="Unsure" {...register("has_allergies", { required: "Please select an option" })} className={radioInputClasses} />
									<span className={radioLabelClasses}>Unsure</span>
								</label>
							</div>
							{errors.has_allergies && <p className={errorTextClasses}>{errors.has_allergies.message}</p>}
						</div>
						{/* Household Aware (Foster Specific Wording) */}
						<div className="mb-4">
							<label className={labelBaseClasses}>Is everyone in the household aware & supportive of fostering (understanding it is temporary)? *</label>
							<div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
								<label className="inline-flex items-center">
									<input type="radio" value="Yes" {...register("household_aware_foster", { required: "Please confirm household agreement" })} className={radioInputClasses} />
									<span className={radioLabelClasses}>Yes</span>
								</label>
								<label className="inline-flex items-center">
									<input type="radio" value="No" {...register("household_aware_foster", { required: "Please confirm household agreement" })} className={radioInputClasses} />
									<span className={radioLabelClasses}>No</span>
								</label>
							</div>
							{errors.household_aware_foster && <p className={errorTextClasses}>{errors.household_aware_foster.message}</p>}
						</div>
						{/* Separation Plan */}
						<div className="mb-4">
							<label htmlFor="separation_plan" className={labelBaseClasses}>Where will foster animals be kept separate from resident pets during the initial adjustment period? *
								<TooltipButton content="A separate room (like a bathroom or spare bedroom) is usually needed initially to allow safe, gradual introductions." label="More info about separation plan" />
							</label>
							<textarea id="separation_plan" rows={2} {...register("separation_plan", { required: "Please describe your plan for initial separation" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.separation_plan)} h-auto`} />
							{errors.separation_plan && <p className={errorTextClasses}>{errors.separation_plan.message}</p>}
						</div>


						{/* --- Current Pet Info Section --- */}
						<hr className="my-6 border-gray-300 dark:border-gray-600" />
						<h4 className={sectionTitleClasses}>
							Current Pet Information
							<TooltipButton content="Helps us understand compatibility and ensure safety for both your pets and potential foster animals." label="More info about current pet questions" />
						</h4>
						{/* Current Pets */}
						<div className="mb-4">
							<label className={labelBaseClasses}>Do you currently have other pets? *</label>
							<div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
								<label className="inline-flex items-center">
									<input type="radio" value="Yes" {...register("has_current_pets", { required: "Please answer about current pets" })} className={radioInputClasses} />
									<span className={radioLabelClasses}>Yes</span>
								</label>
								<label className="inline-flex items-center">
									<input type="radio" value="No" {...register("has_current_pets", { required: "Please answer about current pets" })} className={radioInputClasses} />
									<span className={radioLabelClasses}>No</span>
								</label>
							</div>
							{errors.has_current_pets && <p className={errorTextClasses}>{errors.has_current_pets.message}</p>}
						</div>
						{/* Current Pet Details (Conditional) */}
						{hasCurrentPetsValue === 'Yes' && (
							<div className="mb-4 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
								<label htmlFor="current_pets_details" className={labelBaseClasses}>Please list their species, breed (if known), age and if spayed/neutered. *</label>
								<textarea id="current_pets_details" rows={3} {...register("current_pets_details", { required: "Details required if you have current pets" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.current_pets_details)} h-auto`} />
								{errors.current_pets_details && <p className={errorTextClasses}>{errors.current_pets_details.message}</p>}

								<div className="mt-4">
									<label className={labelBaseClasses}>Are your current pets UTD on vaccinations? *</label>
									<div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
										<label className="inline-flex items-center">
											<input type="radio" value="Yes" {...register("current_pets_vaccinations", { required: "Vaccination status required" })} className={radioInputClasses} />
											<span className={radioLabelClasses}>Yes</span>
										</label>
										<label className="inline-flex items-center">
											<input type="radio" value="No" {...register("current_pets_vaccinations", { required: "Vaccination status required" })} className={radioInputClasses} />
											<span className={radioLabelClasses}>No</span>
										</label>
									</div>
									{errors.current_pets_vaccinations && <p className={errorTextClasses}>{errors.current_pets_vaccinations.message}</p>}
								</div>
								<div className="mt-4">
									<label className={labelBaseClasses}>Are your current pets spayed/neutered? *</label>
									<div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
										<label className="inline-flex items-center">
											<input type="radio" value="Yes" {...register("current_pets_spayed_neutered", { required: "Spay/neuter status required" })} className={radioInputClasses} />
											<span className={radioLabelClasses}>Yes, all</span>
										</label>
										<label className="inline-flex items-center">
											<input type="radio" value="Some" {...register("current_pets_spayed_neutered", { required: "Spay/neuter status required" })} className={radioInputClasses} />
											<span className={radioLabelClasses}>Some are</span>
										</label>
										<label className="inline-flex items-center">
											<input type="radio" value="No" {...register("current_pets_spayed_neutered", { required: "Spay/neuter status required" })} className={radioInputClasses} />
											<span className={radioLabelClasses}>No</span>
										</label>
									</div>
									{errors.current_pets_spayed_neutered && <p className={errorTextClasses}>{errors.current_pets_spayed_neutered.message}</p>}
								</div>
							</div>
						)}
						{/* Veterinarian Info (Optional) */}
						<div className="mb-4">
							<h5 className={subSectionTitleClasses}>Veterinarian Information (Optional)</h5>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label htmlFor="vet_clinic_name" className={labelBaseClasses}>Clinic Name</label>
									<input type="text" id="vet_clinic_name" {...register("vet_clinic_name")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.vet_clinic_name)}`} />
								</div>
								<div>
									<label htmlFor="vet_phone" className={labelBaseClasses}>Clinic Phone</label>
									<input type="tel" id="vet_phone" {...register("vet_phone")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.vet_phone)}`} />
								</div>
							</div>
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
								Providing veterinarian information (current or previous) helps us better understand your pet care experience. This step is optional at this stage.
							</p>
						</div>

						{/* --- Fostering Preferences & Experience Section --- */}
						<hr className="my-6 border-gray-300 dark:border-gray-600" />
						<h4 className={sectionTitleClasses}>
							Fostering Preferences & Experience
							<TooltipButton content="Helps us match you with foster animals that fit your abilities, interests, and home environment." label="More info about fostering preferences" />
						</h4>
						{/* Foster Experience */}
						<div className="mb-4">
							<label className={labelBaseClasses}>Have you fostered for a rescue/shelter before? *</label>
							<div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
								<label className="inline-flex items-center">
									<input type="radio" value="Yes" {...register("has_fostered_before", { required: "Please answer about prior fostering" })} className={radioInputClasses} />
									<span className={radioLabelClasses}>Yes</span>
								</label>
								<label className="inline-flex items-center">
									<input type="radio" value="No" {...register("has_fostered_before", { required: "Please answer about prior fostering" })} className={radioInputClasses} />
									<span className={radioLabelClasses}>No</span>
								</label>
							</div>
							{errors.has_fostered_before && <p className={errorTextClasses}>{errors.has_fostered_before.message}</p>}
						</div>
						{/* Previous Foster Details (Conditional) */}
						{hasFosteredBeforeValue === 'Yes' && (
							<div className="mb-4 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
								<label htmlFor="previous_foster_details" className={labelBaseClasses}>If Yes, which organization(s) and what types of animals? *</label>
								<textarea id="previous_foster_details" rows={3} {...register("previous_foster_details", { required: "Details required if you fostered before" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.previous_foster_details)} h-auto`} />
								{errors.previous_foster_details && <p className={errorTextClasses}>{errors.previous_foster_details.message}</p>}
							</div>
						)}
						{/* Why Foster */}
						<div className="mb-4">
							<label htmlFor="why_foster" className={labelBaseClasses}>Why are you interested in fostering for Second Chance? *</label>
							<textarea id="why_foster" rows={3} {...register("why_foster", { required: "Please share your reasons for fostering" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.why_foster)} h-auto`} />
							{errors.why_foster && <p className={errorTextClasses}>{errors.why_foster.message}</p>}
						</div>
						{/* Types of Animals */}
						<div className="mb-4">
							<label className={labelBaseClasses}>What types of animals are you interested in fostering? * (Check all that apply)</label>
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mt-1">
								{['Adult Dogs (Over 1 yr)', 'Puppies (< 1 yr)', 'Senior Dogs (7+ yrs)', 'Medical Needs Dogs', 'Large Breed Dogs (>50lbs)', 'Small Breed Dogs (<20lbs)', 'Adult Cats (Over 1 yr)', 'Kittens (< 6 mo)', 'Bottle Baby Kittens', 'Senior Cats (10+ yrs)', 'Medical Needs Cats', 'Other Species (Specify Below)'].map((type) => (
									<div key={type} className="flex items-center">
										<input
											type="checkbox"
											id={`type-${type.replace(/\s+/g, '-')}`}
											value={type}
											{...register("foster_animal_types", { required: "Please select at least one type" })}
											className={checkboxInputClasses}
										/>
										<label htmlFor={`type-${type.replace(/\s+/g, '-')}`} className={checkboxLabelClasses}>{type}</label>
									</div>
								))}
							</div>
							{errors.foster_animal_types && <p className={errorTextClasses}>{errors.foster_animal_types.message}</p>}
						</div>
						{/* Willingness Medical/Behavioral */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-4">
							<div>
								<label className={labelBaseClasses}>Willing to foster animals needing medication / special medical care? *</label>
								<select {...register("willing_medical", { required: "Please select an option" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.willing_medical)}`}>
									<option value="">Select...</option>
									<option value="Yes">Yes</option>
									<option value="Maybe">Maybe (Depending on need)</option>
									<option value="No">No</option>
								</select>
								{errors.willing_medical && <p className={errorTextClasses}>{errors.willing_medical.message}</p>}
							</div>
							<div>
								<label className={labelBaseClasses}>Willing to foster animals with known behavioral challenges? *</label>
								<select {...register("willing_behavioral", { required: "Please select an option" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.willing_behavioral)}`}>
									<option value="">Select...</option>
									<option value="Yes">Yes</option>
									<option value="Maybe">Maybe (Depending on need/support)</option>
									<option value="No">No</option>
								</select>
								{errors.willing_behavioral && <p className={errorTextClasses}>{errors.willing_behavioral.message}</p>}
							</div>
						</div>
						{/* Commitment Length */}
						<div className="mb-4">
							<label htmlFor="commitment_length" className={labelBaseClasses}>Typical length of foster time commitment? *</label>
							<select id="commitment_length" {...register("commitment_length", { required: "Please select commitment length" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.commitment_length)}`}>
								<option value="">Select...</option>
								<option value="Short-term (<1 month)">Short-term (Less than 1 month)</option>
								<option value="Medium-term (1-3 months)">Medium-term (1-3 months)</option>
								<option value="Longer-term (3+ months)">Longer-term (3+ months)</option>
								<option value="Flexible">Flexible</option>
							</select>
							{errors.commitment_length && <p className={errorTextClasses}>{errors.commitment_length.message}</p>}
						</div>
						{/* Transportation */}
						<div className="mb-4">
							<label className={labelBaseClasses}>Able to transport foster animal to vet appointments/events (primarily West Valley)? *
								<TooltipButton content="Foster animals require transport to vet appointments (covered by rescue) and potentially adoption events." label="More info about transport needs" />
							</label>
							<select {...register("can_transport", { required: "Please select transport ability" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.can_transport)}`}>
								<option value="">Select...</option>
								<option value="Yes">Yes</option>
								<option value="Maybe">Maybe (With limitations - please explain below)</option>
								<option value="No">No (May limit types of animals we can place)</option>
							</select>
							{errors.can_transport && <p className={errorTextClasses}>{errors.can_transport.message}</p>}
							{/* Textarea for explanation if "Maybe" */}
							{watch("can_transport") === "Maybe" && (
								<textarea id="transport_explanation" rows={2} {...register("transport_explanation")} placeholder="Please explain your limitations..." className={`${inputBaseClasses} ${inputBorderClasses(!!errors.transport_explanation)} h-auto mt-2`} />
							)}
							{errors.transport_explanation && <p className={errorTextClasses}>{errors.transport_explanation.message}</p>}
						</div>
						{/* How Heard About Us (Optional) */}
						<div className="mb-4">
							<label htmlFor="how_heard" className={labelBaseClasses}>How did you hear about our foster program? (Optional)</label>
							<input type="text" id="how_heard" {...register("how_heard")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.how_heard)}`} />
						</div>


						{/* --- Waiver Section --- */}
						<hr className="my-6 border-gray-300 dark:border-gray-600" />
						<h4 className={sectionTitleClasses}>
							Foster Agreement & Waiver
							<TooltipButton content="Please read and agree to the terms to become a foster." label="More info about foster agreement" />
						</h4>
						<div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600">
							<h5 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Waiver and Liability Agreement:</h5>
							<div className="prose prose-sm dark:prose-invert max-h-60 overflow-y-auto p-2 border dark:border-gray-500 rounded bg-white dark:bg-gray-700/50 mb-3">
								<pre className="whitespace-pre-wrap font-sans">{FOSTER_WAIVER_TEXT}</pre>
							</div>

							<div className="mb-4">
								<label htmlFor="waiver_agreed" className="flex items-center cursor-pointer">
									<input
										type="checkbox"
										id="waiver_agreed"
										{...register("waiver_agreed", { required: "You must agree to the terms." })}
										className={`${checkboxInputClasses} ${errors.waiver_agreed ? 'border-red-500' : ''}`}
									/>
									<span className={`${checkboxLabelClasses} ml-2`}>
										I have read, understand, and agree to the Foster Agreement and Waiver of Liability terms stated above. *
									</span>
								</label>
								{errors.waiver_agreed && <p className={errorTextClasses}>{errors.waiver_agreed.message}</p>}
							</div>

							<div>
								<label htmlFor="e_signature_name" className={labelBaseClasses}>
									Electronic Signature (Type Full Name) *
									<TooltipButton content="Typing your full name here acts as your electronic signature, confirming your agreement." label="More info about electronic signature" />
								</label>
								<input
									type="text"
									id="e_signature_name"
									{...register("e_signature_name", {
										required: "Please type your full name as your signature.",
										validate: (value, formValues) => {
											if (formValues.waiver_agreed && (!value || value.trim() === '')) {
												return "Signature is required if waiver is agreed.";
											}
											return true;
										}
									})}
									className={`${inputBaseClasses} ${inputBorderClasses(!!errors.e_signature_name)}`}
									placeholder="Type your full legal name"
								/>
								{errors.e_signature_name && <p className={errorTextClasses}>{errors.e_signature_name.message}</p>}
							</div>
						</div>


						{/* Submit/Cancel Buttons */}
						<div className="flex justify-end gap-3 pt-6 border-t border-gray-300 dark:border-gray-700 mt-6">
							<button
								type="button"
								onClick={onClose}
								disabled={isSubmitting}
								className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isSubmitting}
								className="px-4 py-2 text-white bg-primary rounded-md hover:bg-primary-700 focus:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800 disabled:opacity-50">
								{isSubmitting ? "Submitting..." : "Submit Foster Application"}
							</button>
						</div>
					</form>
				) : (
					// Success Message Area
					<div className="flex flex-col items-center justify-center text-center min-h-[200px]">
							<SuccessCheckmarkIcon />
							<h3 className="py-5 text-xl text-green-600 dark:text-green-400">Application Submitted!</h3>
							<p className="text-gray-700 dark:text-gray-300 md:px-3">{submitMessage}</p>
						<button type="button" className="mt-6 text-teal-600 dark:text-teal-400 hover:underline focus:outline-none" onClick={onClose}>Close</button>
					</div>
				)}
				{/* Display submission error message if not successful */}
				{!isSuccess && submitMessage && (
					<p className="mt-4 text-center text-red-500 dark:text-red-400">{submitMessage}</p>
				)}
			</div>
		</div>
	);
}
