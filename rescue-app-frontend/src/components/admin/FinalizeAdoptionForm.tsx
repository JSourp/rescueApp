'use client';

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { LoadingSpinner, SuccessCheckmarkIcon } from '@/components/Icons';
import { getAuth0AccessToken } from '@/utils/auth'; // Shared helper
import { Animal } from '@/types/animal';
import { format } from 'date-fns'; // For default date
import { FinalizeAdoptionFormDetail } from '@/types/finalizeAdoptionFormDetail';

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
	} = useForm<FinalizeAdoptionFormDetail>({
		mode: 'onTouched',
		defaultValues: {
			// Pre-fill adoption date to today
			adoptionDate: format(new Date(), 'yyyy-MM-dd'),
			// Initialize other fields
			adopterFirstName: '',
			adopterLastName: '',
			adopterEmail: '',
			adopterPrimaryPhone: '',
			adopterPrimaryPhoneType: '',
			adopterStreetAddress: '',
			adopterCity: '',
			adopterStateProvince: '',
			adopterZipPostalCode: '',
		},
	});

	const handleFinalize: SubmitHandler<FinalizeAdoptionFormDetail> = async (formData) => {
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

		// Construct payload
		const payload = {
			animalId: animal.id,
			adopterFirstName: formData.adopterFirstName,
			adopterLastName: formData.adopterLastName,
			adopterEmail: formData.adopterEmail,
			adopterPrimaryPhone: formData.adopterPrimaryPhone,
			adopterPrimaryPhoneType: formData.adopterPrimaryPhoneType,
			adopterSecondaryPhone: formData.adopterSecondaryPhone || null, // Send null if empty
			adopterSecondaryPhoneType: formData.adopterSecondaryPhoneType || null, // Send null if empty
			adopterStreetAddress: formData.adopterStreetAddress,
			adopterAptUnit: formData.adopterAptUnit || null, // Send null if empty
			adopterCity: formData.adopterCity,
			adopterStateProvince: formData.adopterStateProvince,
			adopterZipPostalCode: formData.adopterZipPostalCode,
			spousePartnerRoommate: formData.spousePartnerRoommate || null,
			adoptionDate: formData.adoptionDate ? new Date(formData.adoptionDate).toISOString() : new Date().toISOString(), // Send as ISO string
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
				console.log(`API call failed with status: ${response.status} ${response.statusText}`);
				let detailedError = `Error ${response.status}: ${response.statusText}`; // Default error
				try {
					// Attempt to parse the JSON body sent by your backend's CreateErrorResponse helper
					const errorBody = await response.json();
					console.log("Parsed error body from backend:", errorBody); // Log what was parsed

					// Check for the nested error object and its message property
					if (errorBody && errorBody.error && typeof errorBody.error.message === 'string') {
						detailedError = errorBody.error.message; // Use the nested message
						console.log("Using specific error message from backend:", detailedError);
					} else {
						console.log("Backend error body did not contain expected 'error.message' property.");
					}
				} catch (jsonError) {
					// Log if JSON parsing failed (e.g., if backend sent plain text or HTML error page)
					console.error("Could not parse error response body as JSON:", jsonError);
				}
				// Throw an error with the detailed message
				console.log("Throwing error with message:", detailedError);
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
			// This catch block receives the Error thrown above
			console.error("Finalize adoption catch block:", error);
			const errorMessageToSet = error.message || "An unknown error occurred while finalizing adoption.";
			console.log("Setting apiError state to:", errorMessageToSet); // Log what's being set
			setApiError(errorMessageToSet);
			setIsSuccess(false);
		} finally {
			setIsProcessing(false);
		}
	};

	// --- Base styling classes ---
	const inputBaseClasses = "w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-gray-100 dark:focus:ring-gray-900 focus:border-gray-500 dark:focus:border-gray-500";
	const inputBorderClasses = (hasError: boolean) => hasError ? 'border-red-500 dark:border-red-600' : 'border-gray-300 dark:border-gray-600';
	const errorTextClasses = "text-red-500 dark:text-red-400 text-xs mt-1";
	const labelBaseClasses = "block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300";
	const sectionTitleClasses = "text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200";

	return (
		<div className="flex flex-col max-h-[85vh]">
			{/* Header */}
			<div className="flex-shrink-0 p-5 bg-gray-600">
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
								<label htmlFor="adopterFirstName" className={labelBaseClasses}>First Name *</label>
								<input type="text" id="adopterFirstName" {...register("adopterFirstName", { required: "First name is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adopterFirstName)}`} />
								{errors.adopterFirstName && <p className={errorTextClasses}>{errors.adopterFirstName.message}</p>}
							</div>
							{/* Last Name */}
							<div>
								<label htmlFor="adopterLastName" className={labelBaseClasses}>Last Name *</label>
								<input type="text" id="adopterLastName" {...register("adopterLastName", { required: "Last name is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adopterLastName)}`} />
								{errors.adopterLastName && <p className={errorTextClasses}>{errors.adopterLastName.message}</p>}
							</div>
						</div>
						{/* Spouse/Partner (Optional) */}
						<div className="mb-4">
							<label htmlFor="spousePartnerRoommate" className={labelBaseClasses}>Spouse / Partner / Roommate Name(s) (Optional)</label>
							<input type="text" id="spousePartnerRoommate" {...register("spousePartnerRoommate")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.spousePartnerRoommate)}`} />
						</div>
						{/* Primary Email */}
						<div className="mb-4">
							<label htmlFor="adopterEmail" className={labelBaseClasses}>Email *</label>
							<input type="email" id="adopterEmail" {...register("adopterEmail", { required: "Email is required", pattern: { value: /^\S+@\S+$/i, message: "Invalid email format" } })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adopterEmail)}`} />
							{errors.adopterEmail && <p className={errorTextClasses}>{errors.adopterEmail.message}</p>}
						</div>
						{/* Primary Phone */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
							<div>
								<label htmlFor="adopterPrimaryPhone" className={labelBaseClasses}>Primary Phone *</label>
								<input type="tel" id="adopterPrimaryPhone" {...register("adopterPrimaryPhone", { required: "Primary phone is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adopterPrimaryPhone)}`} />
								{errors.adopterPrimaryPhone && <p className={errorTextClasses}>{errors.adopterPrimaryPhone.message}</p>}
							</div>
							<div>
								<label htmlFor="adopterPrimaryPhoneType" className={labelBaseClasses}>Primary Phone Type *</label>
								<select id="adopterPrimaryPhoneType" {...register("adopterPrimaryPhoneType", { required: "Select phone type" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adopterPrimaryPhoneType)}`}>
									<option value="">Select Type...</option>
									<option value="Cell">Cell</option>
									<option value="Home">Home</option>
									<option value="Work">Work</option>
								</select>
								{errors.adopterPrimaryPhoneType && <p className={errorTextClasses}>{errors.adopterPrimaryPhoneType.message}</p>}
							</div>
						</div>
						{/* Secondary Phone (Optional) */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
							<div>
								<label htmlFor="adopterSecondaryPhone" className={labelBaseClasses}>Secondary Phone (Optional)</label>
								<input type="tel" id="adopterSecondaryPhone" {...register("adopterSecondaryPhone")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adopterSecondaryPhone)}`} />
							</div>
							<div>
								<label htmlFor="adopterSecondaryPhoneType" className={labelBaseClasses}>Secondary Phone Type</label>
								<select id="adopterSecondaryPhoneType" {...register("adopterSecondaryPhoneType")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adopterSecondaryPhoneType)}`}>
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
							<label htmlFor="adopterStreetAddress" className={labelBaseClasses}>Street Address *</label>
							<input type="text" id="adopterStreetAddress" {...register("adopterStreetAddress", { required: "Street address is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adopterStreetAddress)}`} />
							{errors.adopterStreetAddress && <p className={errorTextClasses}>{errors.adopterStreetAddress.message}</p>}
						</div>
						{/* Apt/Unit (Optional) */}
						<div className="mb-4">
							<label htmlFor="adopterAptUnit" className={labelBaseClasses}>Apt/Unit # (Optional)</label>
							<input type="text" id="adopterAptUnit" {...register("adopterAptUnit")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adopterAptUnit)}`} />
						</div>
						{/* City/State/Zip */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
							<div>
								<label htmlFor="adopterCity" className={labelBaseClasses}>City *</label>
								<input type="text" id="adopterCity" {...register("adopterCity", { required: "City is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adopterCity)}`} />
								{errors.adopterCity && <p className={errorTextClasses}>{errors.adopterCity.message}</p>}
							</div>
							<div>
								<label htmlFor="adopterStateProvince" className={labelBaseClasses}>State/Province *</label>
								{/* Consider a dropdown for state if only serving specific areas */}
								<input type="text" id="adopterStateProvince" {...register("adopterStateProvince", { required: "State/Province is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adopterStateProvince)}`} />
								{errors.adopterStateProvince && <p className={errorTextClasses}>{errors.adopterStateProvince.message}</p>}
							</div>
							<div>
								<label htmlFor="adopterZipPostalCode" className={labelBaseClasses}>Zip/Postal Code *</label>
								<input type="text" id="adopterZipPostalCode" {...register("adopterZipPostalCode", { required: "Zip/Postal Code is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adopterZipPostalCode)}`} />
								{errors.adopterZipPostalCode && <p className={errorTextClasses}>{errors.adopterZipPostalCode.message}</p>}
							</div>
						</div>


						{/* --- Adoption Details Section --- */}
						<hr className="my-6 border-gray-300 dark:border-gray-600" />
						<h4 className={sectionTitleClasses}>Adoption Details</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
							<div>
								<label htmlFor="adoptionDate" className={labelBaseClasses}>Adoption Date *</label>
								<input type="date" id="adoptionDate" {...register("adoptionDate", { required: "Adoption date required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adoptionDate)}`} />
								{errors.adoptionDate && <p className={errorTextClasses}>{errors.adoptionDate.message}</p>}
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
								className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-5 rounded-md transition duration-300 disabled:opacity-50">
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
