'use client';

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { LoadingSpinner, ExclamationTriangleIcon, SuccessCheckmarkIcon } from '@/components/Icons';
import { getAuth0AccessToken } from '@/utils/auth';
import { FosterDetailDto } from '@/types/fosterDetail';
import { format } from 'date-fns';

// Define editable fields in the form data interface
interface EditFosterProfileFormData {
	// From User model
	firstName: string;
	lastName: string;
	primaryPhone?: string | null;
	primaryEmail?: string | null;
	isUserActive: boolean;

	// From FosterProfile model
	isActiveFoster: boolean;
	availabilityNotes?: string | null;
	capacityDetails?: string | null;
	homeVisitDate?: string | null;
	homeVisitNotes?: string | null;
}

interface EditFosterProfileFormProps {
	fosterData: FosterDetailDto;
	onClose: () => void;
	onProfileUpdated: () => void;
}

export default function EditFosterProfileForm({
	fosterData,
	onClose,
	onProfileUpdated,
}: EditFosterProfileFormProps) {
	const [apiError, setApiError] = useState<string | null>(null);
	const [isSuccess, setIsSuccess] = useState(false);
	const [submitMessage, setSubmitMessage] = useState("");

	const {
		register,
		handleSubmit,
		reset,
		setValue,
		formState: { errors, isSubmitting, isDirty },
	} = useForm<EditFosterProfileFormData>({
		mode: 'onTouched',
		defaultValues: {
			firstName: fosterData.firstName || '',
			lastName: fosterData.lastName || '',
			primaryPhone: fosterData.primaryPhone || '',
			isUserActive: fosterData.isUserActive === undefined ? true : fosterData.isUserActive, // Default to true if undefined
			isActiveFoster: fosterData.isActiveFoster === undefined ? true : fosterData.isActiveFoster,
			availabilityNotes: fosterData.availabilityNotes || '',
			capacityDetails: fosterData.capacityDetails || '',
			homeVisitDate: fosterData.homeVisitDate ? format(new Date(fosterData.homeVisitDate), 'yyyy-MM-dd') : '',
			homeVisitNotes: fosterData.homeVisitNotes || '',
		},
	});

	// Effect to reset form when initialFosterData changes
	useEffect(() => {
		if (fosterData) {
			reset({
				firstName: fosterData.firstName || '',
				lastName: fosterData.lastName || '',
				primaryPhone: fosterData.primaryPhone || '',
				isUserActive: fosterData.isUserActive === undefined ? true : fosterData.isUserActive,
				isActiveFoster: fosterData.isActiveFoster === undefined ? true : fosterData.isActiveFoster,
				availabilityNotes: fosterData.availabilityNotes || '',
				capacityDetails: fosterData.capacityDetails || '',
				homeVisitDate: fosterData.homeVisitDate ? format(new Date(fosterData.homeVisitDate), 'yyyy-MM-dd') : '',
				homeVisitNotes: fosterData.homeVisitNotes || '',
			});
		}
	}, [fosterData, reset]);

	const handleUpdateSubmit: SubmitHandler<EditFosterProfileFormData> = async (formData) => {
		setApiError(null);
		setIsSuccess(false);
		setSubmitMessage("");

		const accessToken = await getAuth0AccessToken();
		if (!accessToken) {
			setApiError("Authentication error. Could not get token.");
			return;
		}

		// Construct payload matching backend UpdateFosterProfileRequest DTO (camelCase)
		const payload: any = {}; // Start with an empty object
		// Send all form fields, backend will check for changes
		payload.firstName = formData.firstName;
		payload.lastName = formData.lastName;
		payload.primaryPhone = formData.primaryPhone || null;
		payload.primaryEmail = formData.primaryEmail || null;
		payload.isUserActive = formData.isUserActive;
		payload.isActiveFoster = formData.isActiveFoster;
		payload.availabilityNotes = formData.availabilityNotes || null;
		payload.capacityDetails = formData.capacityDetails || null;
		payload.homeVisitDate = formData.homeVisitDate || null;
		payload.homeVisitNotes = formData.homeVisitNotes || null;

		console.log("Submitting foster profile update for UserID:", fosterData.userId, "Payload:", payload);

		try {
			const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
			const response = await fetch(`${apiBaseUrl}/fosters/${fosterData.userId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${accessToken}`,
				},
				body: JSON.stringify(payload),
			});

			const result = await response.json();
			if (!response.ok) {
				throw new Error(result.error?.message || result.message || "Failed to update foster profile.");
			}

			setIsSuccess(true);
			setSubmitMessage("Foster profile updated successfully!");
			onProfileUpdated(); // Trigger data refresh on parent

			setTimeout(() => {
				onClose(); // Close modal after success
			}, 2000);

		} catch (error: any) {
			console.error("Update foster profile error:", error);
			setApiError(error.message || "An unexpected error occurred.");
			setIsSuccess(false);
		}
	};

	// --- Styling classes (can be shared or specific) ---
	const inputBaseClasses = "w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-gray-100 dark:focus:ring-gray-900 focus:border-gray-500 dark:focus:border-gray-500";
	const inputBorderClasses = (hasError: boolean) => hasError ? 'border-red-500 dark:border-red-600' : 'border-gray-300 dark:border-gray-600';
	const errorTextClasses = "text-red-500 dark:text-red-400 text-xs mt-1";
	const labelBaseClasses = "block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300";
	const checkboxLabelClasses = "ml-2 text-sm text-gray-700 dark:text-gray-300";
	const checkboxInputClasses = "form-checkbox h-4 w-4 text-primary border-gray-300 dark:border-gray-500 rounded focus:ring-gray-500 dark:bg-gray-600";

	return (
		<div className="flex flex-col max-h-[85vh]">
			<div className="flex-shrink-0 p-5 bg-primary text-white">
				<h3 className="text-lg text-center font-semibold">Edit Foster Profile: {fosterData.firstName} {fosterData.lastName}</h3>
			</div>

			<div className="flex-grow p-6 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
				{!isSuccess ? (
					<form onSubmit={handleSubmit(handleUpdateSubmit)} noValidate>
						<div className="space-y-4">
							{/* User Details */}
							<h4 className="text-md font-semibold mt-2 mb-1 text-gray-700 dark:text-gray-300">User Account Details</h4>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label htmlFor="firstName" className={labelBaseClasses}>First Name *</label>
									<input type="text" id="firstName" {...register("firstName", { required: "First name is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.firstName)}`} />
									{errors.firstName && <p className={errorTextClasses}>{errors.firstName.message}</p>}
								</div>
								<div>
									<label htmlFor="lastName" className={labelBaseClasses}>Last Name *</label>
									<input type="text" id="lastName" {...register("lastName", { required: "Last name is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.lastName)}`} />
									{errors.lastName && <p className={errorTextClasses}>{errors.lastName.message}</p>}
								</div>
							</div>
							<div>
								<label htmlFor="primaryPhone" className={labelBaseClasses}>Primary Phone</label>
								<input type="tel" id="primaryPhone" {...register("primaryPhone")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.primaryPhone)}`} />
								{errors.primaryPhone && <p className={errorTextClasses}>{errors.primaryPhone.message}</p>}
							</div>
							<div>
								<label htmlFor="primaryEmail" className={labelBaseClasses}>Primary Email</label>
								<input type="tel" id="primaryEmail" {...register("primaryEmail")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.primaryEmail)}`} />
								{errors.primaryEmail && <p className={errorTextClasses}>{errors.primaryEmail.message}</p>}
							</div>
							<div className="flex items-center">
								<input type="checkbox" id="isUserActive" {...register("isUserActive")} className={checkboxInputClasses} />
								<label htmlFor="isUserActive" className={checkboxLabelClasses}>User Account Active (can login)</label>
							</div>

							{/* Foster Profile Details */}
							<hr className="my-5 border-gray-300 dark:border-gray-600" />
							<h4 className="text-md font-semibold mb-1 text-gray-700 dark:text-gray-300">Foster Profile Details</h4>
							<div className="flex items-center">
								<input type="checkbox" id="isActiveFoster" {...register("isActiveFoster")} className={checkboxInputClasses} />
								<label htmlFor="isActiveFoster" className={checkboxLabelClasses}>Actively Fostering</label>
							</div>
							<div>
								<label htmlFor="availabilityNotes" className={labelBaseClasses}>Availability Notes</label>
								<textarea id="availabilityNotes" rows={3} {...register("availabilityNotes")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.availabilityNotes)} h-auto`} />
							</div>
							<div>
								<label htmlFor="capacityDetails" className={labelBaseClasses}>Capacity Details</label>
								<textarea id="capacityDetails" rows={3} {...register("capacityDetails")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.capacityDetails)} h-auto`} />
							</div>
							<div>
								<label htmlFor="homeVisitDate" className={labelBaseClasses}>Home Visit Date</label>
								<input type="date" id="homeVisitDate" {...register("homeVisitDate")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.homeVisitDate)}`} />
							</div>
							<div>
								<label htmlFor="homeVisitNotes" className={labelBaseClasses}>Home Visit Notes</label>
								<textarea id="homeVisitNotes" rows={3} {...register("homeVisitNotes")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.homeVisitNotes)} h-auto`} />
							</div>
						</div>

						{/* Submit/Cancel Buttons */}
						<div className="flex justify-end gap-3 pt-6 border-t border-gray-300 dark:border-gray-700 mt-6">
							<button
								type="button"
								onClick={onClose}
								disabled={isSubmitting}
								className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800">
								Cancel
							</button>
							<button
								type="submit"
								disabled={isSubmitting}
								className="px-4 py-2 text-white bg-primary rounded-md hover:bg-primary-700 focus:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800 disabled:opacity-50">
								{isSubmitting ? <LoadingSpinner /> : "Save Changes"}
							</button>
						</div>
					</form>
				) : (
					<div className="flex flex-col items-center justify-center text-center min-h-[200px]">
						<SuccessCheckmarkIcon />
						<h3 className="py-5 text-xl text-green-600 dark:text-green-400">Profile Updated!</h3>
						<p className="text-gray-700 dark:text-gray-300">{submitMessage}</p>
					</div>
				)}
				{apiError && (
					<p className="mb-4 p-3 text-sm text-center text-red-700 bg-red-100 dark:text-red-200 dark:bg-red-900/30 border border-red-300 dark:border-red-600 rounded-md">
						<ExclamationTriangleIcon className="h-5 w-5 inline mr-1 align-text-bottom" /> Error: {apiError}
					</p>
				)}
			</div>
		</div>
	);
}
