'use client';

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { LoadingSpinner, ExclamationTriangleIcon } from '@/components/Icons';
import { getAuth0AccessToken } from '@/utils/auth'; // Shared helper
import { Animal } from '@/types/animal'; // Import your Animal type
import { format } from 'date-fns'; // For default date
import { adoptionStatuses } from '@/constants/adoptionStatuses'; // Import list of statuses

// Define the shape of the form data
interface ProcessReturnFormData {
	return_date: string; // Input type="date" provides YYYY-MM-DD string
	adoption_status: string;
	notes?: string;
}

interface ProcessReturnFormProps {
	animal: Animal; // The animal being returned
	onClose: () => void;
	onReturnComplete: () => void; // Callback on success
}

export default function ProcessReturnForm({ animal, onClose, onReturnComplete }: ProcessReturnFormProps) {
	const [apiError, setApiError] = useState<string | null>(null);
	const [isSuccess, setIsSuccess] = useState<boolean>(false);
	const [isProcessing, setIsProcessing] = useState<boolean>(false);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting }, // Use isSubmitting from RHF
	} = useForm<ProcessReturnFormData>({
		mode: 'onTouched',
		defaultValues: {
			return_date: format(new Date(), 'yyyy-MM-dd'), // Default to today
			adoption_status: 'Needs Assessment', // Sensible default post-return status?
			notes: '',
		},
	});

	const handleProcessReturn: SubmitHandler<ProcessReturnFormData> = async (formData) => {
		if (isProcessing) return; // Use manual flag if preferred, but isSubmitting works too
		setIsProcessing(true); // Indicate processing
		setApiError(null);
		setIsSuccess(false);

		const accessToken = await getAuth0AccessToken();
		if (!accessToken) {
			setApiError("Authentication error. Could not get token.");
			setIsProcessing(false);
			return;
		}

		// Construct payload matching backend ProcessReturnRequest DTO
		const payload = {
			animal_id: animal.id,
			return_date: formData.return_date ? new Date(formData.return_date).toISOString() : new Date().toISOString(),
			adoption_status: formData.adoption_status,
			Notes: formData.notes || null,
		};

		console.log('Processing return with payload:', payload);

		try {
			const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
			// POST to the dedicated /api/returns endpoint
			const response = await fetch(`${apiBaseUrl}/returns`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${accessToken}`,
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				let errorMsg = `Error ${response.status}: Failed to process return.`;
				try { const errorBody = await response.json(); errorMsg = errorBody.message || errorMsg; }
				catch (_) { errorMsg = `${response.status}: ${response.statusText}`; }
				throw new Error(errorMsg);
			}

			const result = await response.json(); // Get success message or updated record
			console.log('Return processed successfully!', result);

			// Success
			setIsSuccess(true);
			setApiError(null);
			onReturnComplete(); // Notify parent immediately to refresh list
			onClose(); // Close the modal on success

		} catch (error: any) {
			console.error("Process return error:", error);
			setApiError(error.message || "An unknown error occurred.");
			setIsSuccess(false);
		} finally {
			setIsProcessing(false);
		}
	};

	// --- Base styling classes (using a neutral/blue theme for return) ---
	const inputBaseClasses = "w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-500 dark:focus:border-blue-500"; // Blue focus
	const inputBorderClasses = (hasError: boolean) => hasError ? 'border-red-500 dark:border-red-600' : 'border-gray-300 dark:border-gray-600';
	const errorTextClasses = "text-red-500 dark:text-red-400 text-xs mt-1";
	const labelBaseClasses = "block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300";
	const sectionTitleClasses = "text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200";

	return (
		<div className="flex flex-col max-h-[85vh]">
			{/* Header */}
			<div className="flex-shrink-0 p-5 bg-blue-600">
				<h3 className="text-lg text-white text-center font-semibold">
					Process Return for {animal.name}
				</h3>
			</div>

			{/* Form Area - Scrollable */}
			<div className="flex-grow p-6 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
				<form onSubmit={handleSubmit(handleProcessReturn)} noValidate>
					{apiError && (
						<p className="mb-4 p-3 text-sm text-center text-red-700 bg-red-100 dark:text-red-200 dark:bg-red-900/30 border border-red-300 dark:border-red-600 rounded-md">
							<ExclamationTriangleIcon className="h-5 w-5 inline mr-1 align-text-bottom" /> {apiError}
						</p>
					)}

					<div className="space-y-4">
						{/* Return Date */}
						<div>
							<label htmlFor="return_date" className={labelBaseClasses}>Return Date *</label>
							<input
								type="date"
								id="return_date"
								{...register("return_date", { required: "Return date is required" })}
								className={`${inputBaseClasses} ${inputBorderClasses(!!errors.return_date)}`}
							/>
							{errors.return_date && <p className={errorTextClasses}>{errors.return_date.message}</p>}
						</div>

						{/* New Animal Status */}
						<div>
							<label htmlFor="adoption_status" className={labelBaseClasses}>New Status for Animal *</label>
							<select
								id="adoption_status"
								{...register("adoption_status", { required: "New status is required" })}
								className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adoption_status)}`}
							>
								<option value="">Select New Status...</option>
								{adoptionStatuses.map(status => (
									<option key={status} value={status}>{status}</option>
								))}
							</select>
							{errors.adoption_status && <p className={errorTextClasses}>{errors.adoption_status.message}</p>}
						</div>

						{/* Return Notes */}
						<div>
							<label htmlFor="notes" className={labelBaseClasses}>Reason / Notes for Return (Optional)</label>
							<textarea
								id="notes"
								rows={4}
								{...register("notes")}
								className={`${inputBaseClasses} ${inputBorderClasses(!!errors.notes)} h-auto`}
								placeholder="Enter any details about the return..."
							/>
						</div>
					</div>

					{/* Form Actions */}
					<div className="flex justify-end gap-3 pt-6 border-t border-gray-300 dark:border-gray-700 mt-6">
						<button
							type="button"
							onClick={onClose}
							disabled={isSubmitting || isProcessing} // Disable if processing
							className="bg-neutral-200 hover:bg-neutral-300 text-neutral-800 dark:bg-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-500 font-medium py-2 px-5 rounded-md transition duration-300 disabled:opacity-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting || isProcessing} // Use both flags for robust disable
							className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-5 rounded-md transition duration-300 disabled:opacity-50" // Blue theme
						>
							{isSubmitting || isProcessing ? (
								<LoadingSpinner className="w-5 h-5 mx-auto" />
							) : (
								'Confirm Return'
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
