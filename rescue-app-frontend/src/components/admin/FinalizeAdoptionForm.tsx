'use client';

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { LoadingSpinner, SuccessCheckmarkIcon } from '@/components/Icons';
import { getAuth0AccessToken } from '@/utils/auth'; // Shared helper
import { Animal } from '@/types/animal'; // Import your Animal type
import { format } from 'date-fns'; // For default date

interface FinalizeFormData {
	// Adopter Info
	adopter_first_name: string;
	adopter_last_name: string;
	adopter_email: string;
	adopter_primary_phone: string;
	adopter_primary_phone_type: 'Cell' | 'Home' | 'Work' | '';
	adopter_secondary_phone?: string;
	adopter_secondary_phone_type?: 'Cell' | 'Home' | 'Work' | '';
	adopter_street_address: string;
	adopter_apt_unit?: string;
	adopter_city: string;
	adopter_state_province: string;
	adopter_zip_postal_code: string;
	spouse_partner_roommate?: string;

	// Adoption Info
	adoption_date: string; // Input type="date" provides YYYY-MM-DD string
	notes?: string;
}

interface FinalizeAdoptionFormProps {
	animal: Animal; // The animal being adopted
	onClose: () => void;
	onAdoptionComplete: () => void; // Callback on success
}

export default function FinalizeAdoptionForm({ animal, onClose, onAdoptionComplete }: FinalizeAdoptionFormProps) {
	const [apiError, setApiError] = useState<string | null>(null);
	const [isSuccess, setIsSuccess] = useState<boolean>(false); // State to show success message
	// Add a specific saving state, independent of RHF's isSubmitting just for this check
	const [isProcessing, setIsProcessing] = useState<boolean>(false);
	const [submitMessage, setSubmitMessage] = useState("");

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<FinalizeFormData>({
		mode: 'onTouched',
		defaultValues: {
			// Pre-fill adoption date to today
			adoption_date: format(new Date(), 'yyyy-MM-dd'),
			// Initialize other fields
			adopter_first_name: '',
			adopter_last_name: '',
			adopter_email: '',
			adopter_primary_phone: '',
			adopter_primary_phone_type: '',
			adopter_street_address: '',
			adopter_city: '',
			adopter_state_province: '',
			adopter_zip_postal_code: '',
		},
	});

	const handleFinalize: SubmitHandler<FinalizeFormData> = async (formData) => {
		if (isProcessing) return;
		setIsProcessing(true);
		setApiError(null); // Clear previous errors
		setIsSuccess(false);
		setSubmitMessage(""); // Clear previous success message


		// --- Get Access Token INSIDE the handler ---
		const accessToken = await getAuth0AccessToken(); // Use imported helper
		if (!accessToken) {
			setApiError("Authentication error. Could not get token.");
			setIsProcessing(false); // <--- Reset on early exit
			return; // Stop submission if token fails
		}
		// --- Got Token ---

		// Construct payload matching backend CreateAdoptionRequest DTO
		// And include animal_id
		const payload = {
			animal_id: animal.id,
			adopter_first_name: formData.adopter_first_name,
			adopter_last_name: formData.adopter_last_name,
			adopter_email: formData.adopter_email,
			adopter_primary_phone: formData.adopter_primary_phone,
			adopter_primary_phone_type: formData.adopter_primary_phone_type,
			adopter_secondary_phone: formData.adopter_secondary_phone || null, // Send null if empty
			adopter_secondary_phone_type: formData.adopter_secondary_phone_type || null, // Send null if empty
			adopter_street_address: formData.adopter_street_address,
			adopter_apt_unit: formData.adopter_apt_unit || null, // Send null if empty
			adopter_city: formData.adopter_city,
			adopter_state_province: formData.adopter_state_province,
			adopter_zip_postal_code: formData.adopter_zip_postal_code,
			spouse_partner_roommate: formData.spouse_partner_roommate || null,
			adoption_date: formData.adoption_date ? new Date(formData.adoption_date).toISOString() : new Date().toISOString(), // Send as ISO string
			notes: formData.notes || null,
		};

		console.log('Finalizing adoption with payload:', payload);

		try {
			const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
			// POST to the dedicated /api/adoptions endpoint
			const response = await fetch(`${apiBaseUrl}/adoptions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${accessToken}`,
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				let detailedError = `Error ${response.status}: ${response.statusText}`; // Default error
				try {
					// Attempt to parse the JSON body sent by your backend's CreateErrorResponse helper
					const errorBody = await response.json();
					// Use the specific message from the backend if it exists
					if (errorBody && errorBody.message) {
						detailedError = errorBody.message;
					}
				} catch (jsonError) {
					// The error response wasn't valid JSON, stick with status text
					console.error("Could not parse error response body as JSON", jsonError);
				}
				// Throw an error with the detailed message
				throw new Error(detailedError);
			}

			const result = await response.json(); // Get created AdoptionHistory record back
			console.log('Adoption finalized successfully!', result);

			// Success: Show message, then call parent handler after delay
			setIsSuccess(true);
			setSubmitMessage('Adoption finalized successfully!');
			setApiError(null);

			// Call parent AFTER success and state is set
			onAdoptionComplete(); // Notify parent list needs refresh

			// Delay the form closure to let the user see the success message
			setTimeout(() => {
				onClose(); // Close the form after a delay
				setIsSuccess(false); // Optionally reset the success state
				setSubmitMessage(""); // Clear the success message
			}, 5000); // Adjust the delay time (e.g., 5000ms = 5 seconds)

		} catch (error: any) {
			console.error("Finalize adoption error:", error);
			// Use the message received from the backend API response if available
			console.error("Finalize adoption error catch block:", error);
			setApiError(error.message || "An unknown error occurred.");
			setIsSuccess(false);
			setSubmitMessage(""); // Clear the success message
		} finally {
			setIsProcessing(false); // <--- Reset processing on finish/error
		}
	};

	// --- Base styling classes (using Indigo theme for Adoption) ---
	const inputBaseClasses = "w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-indigo-100 dark:focus:ring-indigo-900 focus:border-indigo-500 dark:focus:border-indigo-500";
	const inputBorderClasses = (hasError: boolean) => hasError ? 'border-red-500 dark:border-red-600' : 'border-gray-300 dark:border-gray-600';
	const errorTextClasses = "text-red-500 dark:text-red-400 text-xs mt-1";
	const labelBaseClasses = "block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300";
	const sectionTitleClasses = "text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200";

	return (
		<div className="flex flex-col max-h-[85vh]">
			{/* Header */}
			<div className="flex-shrink-0 p-5 bg-indigo-600">
				<h3 className="text-lg text-white text-center font-semibold">
					Finalize Adoption for {animal.name}
				</h3>
			</div>

			{/* Form Area - Scrollable */}
			<div className="flex-grow p-6 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
				{!isSuccess ? (
					<form onSubmit={handleSubmit(handleFinalize)} noValidate>
						{/* --- Adopter Information Section --- */}
						<h4 className={sectionTitleClasses}>Adopter Information</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
							{/* First Name */}
							<div>
								<label htmlFor="adopter_first_name" className={labelBaseClasses}>First Name *</label>
								<input type="text" id="adopter_first_name" {...register("adopter_first_name", { required: "First name is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adopter_first_name)}`} />
								{errors.adopter_first_name && <p className={errorTextClasses}>{errors.adopter_first_name.message}</p>}
							</div>
							{/* Last Name */}
							<div>
								<label htmlFor="adopter_last_name" className={labelBaseClasses}>Last Name *</label>
								<input type="text" id="adopter_last_name" {...register("adopter_last_name", { required: "Last name is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adopter_last_name)}`} />
								{errors.adopter_last_name && <p className={errorTextClasses}>{errors.adopter_last_name.message}</p>}
							</div>
						</div>
						{/* Spouse/Partner (Optional) */}
						<div className="mb-4">
							<label htmlFor="spouse_partner_roommate" className={labelBaseClasses}>Spouse / Partner / Roommate Name(s) (Optional)</label>
							<input type="text" id="spouse_partner_roommate" {...register("spouse_partner_roommate")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.spouse_partner_roommate)}`} />
						</div>
						{/* Primary Email */}
						<div className="mb-4">
							<label htmlFor="adopter_email" className={labelBaseClasses}>Email *</label>
							<input type="email" id="adopter_email" {...register("adopter_email", { required: "Email is required", pattern: { value: /^\S+@\S+$/i, message: "Invalid email format" } })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adopter_email)}`} />
							{errors.adopter_email && <p className={errorTextClasses}>{errors.adopter_email.message}</p>}
						</div>
						{/* Primary Phone */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
							<div>
								<label htmlFor="adopter_primary_phone" className={labelBaseClasses}>Primary Phone *</label>
								<input type="tel" id="adopter_primary_phone" {...register("adopter_primary_phone", { required: "Primary phone is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adopter_primary_phone)}`} />
								{errors.adopter_primary_phone && <p className={errorTextClasses}>{errors.adopter_primary_phone.message}</p>}
							</div>
							<div>
								<label htmlFor="adopter_primary_phone_type" className={labelBaseClasses}>Primary Phone Type *</label>
								<select id="adopter_primary_phone_type" {...register("adopter_primary_phone_type", { required: "Select phone type" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adopter_primary_phone_type)}`}>
									<option value="">Select Type...</option>
									<option value="Cell">Cell</option>
									<option value="Home">Home</option>
									<option value="Work">Work</option>
								</select>
								{errors.adopter_primary_phone_type && <p className={errorTextClasses}>{errors.adopter_primary_phone_type.message}</p>}
							</div>
						</div>
						{/* Secondary Phone (Optional) */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
							<div>
								<label htmlFor="adopter_secondary_phone" className={labelBaseClasses}>Secondary Phone (Optional)</label>
								<input type="tel" id="adopter_secondary_phone" {...register("adopter_secondary_phone")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adopter_secondary_phone)}`} />
							</div>
							<div>
								<label htmlFor="adopter_secondary_phone_type" className={labelBaseClasses}>Secondary Phone Type</label>
								<select id="adopter_secondary_phone_type" {...register("adopter_secondary_phone_type")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adopter_secondary_phone_type)}`}>
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
						</h4>
						{/* Street Address */}
						<div className="mb-4">
							<label htmlFor="adopter_street_address" className={labelBaseClasses}>Street Address *</label>
							<input type="text" id="adopter_street_address" {...register("adopter_street_address", { required: "Street address is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adopter_street_address)}`} />
							{errors.adopter_street_address && <p className={errorTextClasses}>{errors.adopter_street_address.message}</p>}
						</div>
						{/* Apt/Unit (Optional) */}
						<div className="mb-4">
							<label htmlFor="adopter_apt_unit" className={labelBaseClasses}>Apt/Unit # (Optional)</label>
							<input type="text" id="adopter_apt_unit" {...register("adopter_apt_unit")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adopter_apt_unit)}`} />
						</div>
						{/* City/State/Zip */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
							<div>
								<label htmlFor="adopter_city" className={labelBaseClasses}>City *</label>
								<input type="text" id="adopter_city" {...register("adopter_city", { required: "City is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adopter_city)}`} />
								{errors.adopter_city && <p className={errorTextClasses}>{errors.adopter_city.message}</p>}
							</div>
							<div>
								<label htmlFor="adopter_state_province" className={labelBaseClasses}>State/Province *</label>
								{/* Consider a dropdown for state if only serving specific areas */}
								<input type="text" id="adopter_state_province" {...register("adopter_state_province", { required: "State/Province is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adopter_state_province)}`} />
								{errors.adopter_state_province && <p className={errorTextClasses}>{errors.adopter_state_province.message}</p>}
							</div>
							<div>
								<label htmlFor="adopter_zip_postal_code" className={labelBaseClasses}>Zip/Postal Code *</label>
								<input type="text" id="adopter_zip_postal_code" {...register("adopter_zip_postal_code", { required: "Zip/Postal Code is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adopter_zip_postal_code)}`} />
								{errors.adopter_zip_postal_code && <p className={errorTextClasses}>{errors.adopter_zip_postal_code.message}</p>}
							</div>
						</div>


						{/* --- Adoption Details Section --- */}
						<hr className="my-6 border-gray-300 dark:border-gray-600" />
						<h4 className={sectionTitleClasses}>Adoption Details</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
							<div>
								<label htmlFor="adoption_date" className={labelBaseClasses}>Adoption Date *</label>
								<input type="date" id="adoption_date" {...register("adoption_date", { required: "Adoption date required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adoption_date)}`} />
								{errors.adoption_date && <p className={errorTextClasses}>{errors.adoption_date.message}</p>}
							</div>
						</div>
						<div>
							<label htmlFor="notes" className={labelBaseClasses}>Adoption Notes (Optional)</label>
							<textarea id="notes" rows={3} {...register("notes")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.notes)} h-auto`} />
						</div>

						{/* Form Actions */}
						<div className="flex justify-end gap-3 pt-6 border-t border-gray-300 dark:border-gray-700 mt-6">
							<button type="button" onClick={onClose}
								className="bg-neutral-200 hover:bg-neutral-300 text-neutral-800 dark:bg-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-500 font-medium py-2 px-5 rounded-md transition duration-300">
								Cancel
							</button>
							<button type="submit" disabled={isSubmitting || isProcessing}
								className="bg-sc-asparagus-500 hover:bg-sc-asparagus-600 text-white font-medium py-2 px-5 rounded-md transition duration-300 disabled:opacity-50">
								{isSubmitting || isProcessing ? 'Processing...' : 'Confirm Adoption'}
							</button>
						</div>
					</form>
				) : (
					// --- Success Message ---
					<div className="flex flex-col items-center justify-center text-center min-h-[200px]">
						<SuccessCheckmarkIcon className="h-16 w-16 text-green-500 dark:text-green-400" />
						<h3 className="py-5 text-xl text-green-600 dark:text-green-400 font-semibold">Adoption Finalized!</h3>
							<p className="text-gray-700 dark:text-gray-300 md:px-3">{submitMessage}</p>
					</div>
				)}
				{/* Display API Error if not successful */}
				{!isSuccess && apiError && (
					<p className="mb-4 text-sm text-center text-red-600 dark:text-red-400">{apiError}</p>
				)}
			</div>
		</div>
	);
}
