'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { LoadingSpinner, SuccessCheckmarkIcon } from '@/components/Icons';
import { getAuth0AccessToken } from '@/utils/auth';
import { Animal } from '@/types/animal'; // Assuming Animal type includes all fields
import { format } from 'date-fns';
import { adoptionStatuses } from '@/constants/adoptionStatuses'; // Import list of statuses

// Use same FormData shape as AddAnimalForm for editable fields
interface EditAnimalFormData {
	animal_type: string;
	name: string;
	breed: string;
	date_of_birth?: string;
	gender: string;
	weight?: number | string;
	story?: string;
	adoption_status: string;
	image_url?: string | null; // Allow updating image URL later
}

interface EditAnimalFormProps {
	animal: Animal; // Pass the full animal object to edit
	onClose: () => void;
	onAnimalUpdated: () => void; // Callback after successful update
}

export default function EditAnimalForm({ animal, onClose, onAnimalUpdated }: EditAnimalFormProps) {
	const [apiError, setApiError] = useState<string | null>(null);
	const [isUploading, setIsUploading] = useState<boolean>(false); // For image upload state
	const [uploadProgress, setUploadProgress] = useState<number>(0); // Optional progress
	const [selectedFile, setSelectedFile] = useState<File | null>(null); // State for the selected file
	const [previewUrl, setPreviewUrl] = useState<string | null>(animal.image_url || null); // Initialize with existing URL
	const [removeCurrentImage, setRemoveCurrentImage] = useState<boolean>(false); // Track if user wants to remove existing image
	const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting, isDirty },
	} = useForm<EditAnimalFormData>({
		mode: 'onTouched',
		defaultValues: { // Pre-fill form with existing animal data
			animal_type: animal.animal_type || '',
			name: animal.name || '',
			breed: animal.breed || '',
			// Format date for input type="date" (YYYY-MM-DD)
			date_of_birth: animal.date_of_birth ? format(new Date(animal.date_of_birth), 'yyyy-MM-dd') : '',
			gender: animal.gender || '',
			weight: animal.weight ?? '', // Handle null weight
			story: animal.story || '',
			adoption_status: animal.adoption_status || '',
			image_url: animal.image_url || '',
		}
	});

	// Reset form if the animal prop changes (e.g., opening modal for different animal)
	useEffect(() => {
		if (animal) {
			reset({
				animal_type: animal.animal_type || '',
				name: animal.name || '',
				breed: animal.breed || '',
				date_of_birth: animal.date_of_birth ? format(new Date(animal.date_of_birth), 'yyyy-MM-dd') : '',
				gender: animal.gender || '',
				weight: animal.weight ?? '',
				story: animal.story || '',
				adoption_status: animal.adoption_status || '',
			});
			// Reset image state based on incoming animal
			setSelectedFile(null);
			setPreviewUrl(animal.image_url || null);
			setRemoveCurrentImage(false);
			if (fileInputRef.current) fileInputRef.current.value = ''; // Clear file input visually
		}
	}, [animal, reset]);

	const [isSuccess, setIsSuccess] = useState(false);
	const [submitMessage, setSubmitMessage] = useState("");

	// Handler for file input change - generates preview
	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.files && event.target.files[0]) {
			const file = event.target.files[0];
			setSelectedFile(file);
			setRemoveCurrentImage(false); // Selecting a new file cancels removal intention
			// Create preview URL
			const reader = new FileReader();
			reader.onloadend = () => {
				setPreviewUrl(reader.result as string);
			}
			reader.readAsDataURL(file);
			console.log("New file selected:", file.name);
		} else {
			setSelectedFile(null);
			// If they cancelled file selection, revert preview to original image if it exists
			setPreviewUrl(animal.image_url || null);
		}
	};

	// Handler for removing the current/selected image
	const handleRemoveImage = () => {
		setSelectedFile(null); // Clear selected file
		setPreviewUrl(null); // Clear preview
		setRemoveCurrentImage(true); // Mark intent to remove existing image on save
		if (fileInputRef.current) fileInputRef.current.value = ''; // Clear file input visually
	}

	// Handle Save/Submit
	const handleUpdateAnimal: SubmitHandler<EditAnimalFormData> = async (formData) => {
		setApiError(null);
		setIsSuccess(false);
		setSubmitMessage("");

		// --- Get Access Token INSIDE the handler ---
		const accessToken = await getAuth0AccessToken(); // Use imported helper
		if (!accessToken) {
			setApiError("Authentication error. Could not get token.");
			return; // Stop submission if token fails
		}
		// --- Got Token ---

		let image_url: string | null = null; // URL to save in the DB

		// --- Step 1: Upload Image if selected ---
		if (selectedFile) {
			setIsUploading(true); // Indicate image upload started
			setUploadProgress(0); // Reset progress
			console.log("Attempting to upload image:", selectedFile.name);

			try {
				// 1a. Get SAS URL from backend
				const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL; // Get backend base URL
				if (!apiBaseUrl) {
					throw new Error("API Base URL is not configured."); // Add check
				}
				const filename = encodeURIComponent(selectedFile.name);
				const contentType = encodeURIComponent(selectedFile.type);
				const sasUrlResponse = await fetch(`${apiBaseUrl}/generate-upload-url?filename=${filename}&contentType=${contentType}`, { // <-- CORRECTED: Use apiBaseUrl
					headers: { 'Authorization': `Bearer ${accessToken}` }
				});
				if (!sasUrlResponse.ok) {
					throw new Error(`Failed to get upload URL: ${sasUrlResponse.statusText}`);
				}
				const sasData = await sasUrlResponse.json();
				const { sasUrl, blobUrl } = sasData;

				if (!sasUrl || !blobUrl) {
					throw new Error("Backend did not return valid SAS/Blob URL.");
				}
				console.log("Got SAS URL, attempting direct upload to Azure...");

				// 1b. Upload file directly to Azure Blob Storage using SAS URL
				// NOTE: Fetch API upload progress isn't easily tracked.
				// For progress, use XMLHttpRequest or a library like Axios.
				const uploadResponse = await fetch(sasUrl, {
					method: 'PUT',
					headers: {
						'x-ms-blob-type': 'BlockBlob',
						'Content-Type': selectedFile.type,
					},
					body: selectedFile
				});

				if (!uploadResponse.ok) {
					// Try to get error details from Azure Blob Storage response
					const errorText = await uploadResponse.text();
					console.error("Azure Blob Upload Error:", errorText);
					throw new Error(`Failed to upload image to Azure: ${uploadResponse.statusText}`);
				}

				console.log("Image uploaded successfully to:", blobUrl);
				image_url = blobUrl; // Set the URL to save with animal data

			} catch (uploadError: any) {
				console.error("Image upload process failed:", uploadError);
				setApiError(`Image upload failed: ${uploadError.message}`);
				setIsUploading(false);
				// Stop the whole process if image upload fails? Or allow saving without image?
				return; // Stop here if upload fails
			} finally {
				setIsUploading(false); // Indicate image upload finished
			}
		}
		// --- End Image Upload ---

		// Convert weight to number if it's a non-empty string
		let submissionData: any = { ...formData };
		if (submissionData.weight && typeof submissionData.weight === 'string') {
			submissionData.weight = parseFloat(submissionData.weight);
			if (isNaN(submissionData.weight)) {
				// Handle parsing error if needed, though type="number" helps
				submissionData.weight = null;
			}
		} else if (submissionData.weight === '') {
			submissionData.weight = null; // Treat empty string as null
		}
		// Clear date if empty string was somehow submitted
		if (submissionData.date_of_birth === '') {
			submissionData.date_of_birth = null;
		}

		submissionData.image_url = image_url; // Add the uploaded image URL

		console.log(`Submitting update for animal ID ${animal.id}:`, submissionData);

		try {
			const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
			const response = await fetch(`${apiBaseUrl}/animals/${animal.id}`, { // Use PUT and animal ID
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${accessToken}`,
				},
				body: JSON.stringify(submissionData),
			});

			if (!response.ok) {
				let errorMsg = `Error ${response.status}: Failed to update animal.`;
				try {
					// Try to parse error from backend if response has body
					const errorBody = await response.json();
					errorMsg = errorBody.message || errorMsg;
				} catch (_) {
					errorMsg = `${response.status}: ${response.statusText}`; // Fallback
				}
				throw new Error(errorMsg);
			}

			// If response IS ok (e.g., 201 Created)
			const result = await response.json(); // Now parse the successful response (the created animal)
			console.log(`${result.name} updated successfully!`, result);

			// Set state for success UI
			setIsSuccess(true);
			setSubmitMessage(`${result.name} updated successfully!`);

			// Call parent AFTER success and state is set
			onAnimalUpdated(); // Notify parent list needs refresh

			// Delay the form closure to let the user see the success message
			setTimeout(() => {
				onClose(); // Close the form after a delay
				setIsSuccess(false); // Optionally reset the success state
				setSubmitMessage(""); // Clear the success message
			}, 5000); // Adjust the delay time (e.g., 5000ms = 5 seconds)

		} catch (error: any) {
			setIsSuccess(false); // Ensure success is false on error
			setSubmitMessage(error.message || "An unexpected error occurred."); // Use error state instead
			setApiError(error.message || "An unexpected error occurred."); // Set API error state too
			console.error("Update animal error:", error);
		}
	};

	// Determine if the save button should be enabled
	const canSaveChanges = isDirty || selectedFile !== null || removeCurrentImage;

	// --- Base styling classes (use same theme as Add form, e.g., Asparagus) ---
	const inputBaseClasses = "w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-sc-asparagus-100 dark:focus:ring-sc-asparagus-900 focus:border-sc-asparagus-500 dark:focus:border-sc-asparagus-500";
	const inputBorderClasses = (hasError: boolean) => hasError ? 'border-red-500 dark:border-red-600' : 'border-gray-300 dark:border-gray-600';
	const errorTextClasses = "text-red-500 dark:text-red-400 text-xs mt-1";
	const labelBaseClasses = "block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300";


	return (
		<div className="flex flex-col max-h-[85vh]">
			{/* Header */}
			<div className="flex-shrink-0 p-5 bg-sc-asparagus-600">
				<h3 className="text-lg text-white text-center font-semibold">Edit {animal.name}</h3>
			</div>

			{/* Form Area */}
			<div className="flex-grow p-6 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
				{!isSuccess ? (
					<form onSubmit={handleSubmit(handleUpdateAnimal)} noValidate>
						<div className="space-y-4">
							{/* Animal Type */}
							<div>
								<label htmlFor="animal_type" className={labelBaseClasses}>Species *</label>
								<input type="text" id="animal_type" {...register("animal_type", { required: "Species is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.animal_type)}`} />
								{errors.animal_type && <p className={errorTextClasses}>{errors.animal_type.message}</p>}
							</div>

							{/* Name */}
							<div>
								<label htmlFor="name" className={labelBaseClasses}>Name *</label>
								<input type="text" id="name" {...register("name", { required: "Name is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.name)}`} />
								{errors.name && <p className={errorTextClasses}>{errors.name.message}</p>}
							</div>

							{/* Breed */}
							<div>
								<label htmlFor="breed" className={labelBaseClasses}>Breed *</label>
								<input type="text" id="breed" {...register("breed", { required: "Breed is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.breed)}`} />
								{errors.breed && <p className={errorTextClasses}>{errors.breed.message}</p>}
							</div>

							{/* DOB (Optional) */}
							<div>
								<label htmlFor="date_of_birth" className={labelBaseClasses}>Date of Birth (Approx.)</label>
								<input type="date" id="date_of_birth" {...register("date_of_birth")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.date_of_birth)}`} />
								{/* Add max date validation? pattern? */}
							</div>

							{/* Gender */}
							<div>
								<label htmlFor="gender" className={labelBaseClasses}>Gender *</label>
								<select id="gender" {...register("gender", { required: "Gender is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.gender)}`}>
									<option value="">Select...</option>
									<option value="Male">Male</option>
									<option value="Female">Female</option>
									<option value="Unknown">Unknown</option>
								</select>
								{errors.gender && <p className={errorTextClasses}>{errors.gender.message}</p>}
							</div>

							{/* Weight (Optional) */}
							<div>
								<label htmlFor="weight" className={labelBaseClasses}>Weight (lbs)</label>
								<input type="number" step="0.1" min="0" id="weight" {...register("weight", { valueAsNumber: true, min: { value: 0, message: "Weight cannot be negative" } })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.weight)}`} />
								{errors.weight && <p className={errorTextClasses}>{errors.weight.message}</p>}
							</div>

							{/* --- Image Upload/Preview --- */}
							<div>
								<label htmlFor="animalImage" className={labelBaseClasses}>Animal Image</label>
								{/* Show current or new preview */}
								{previewUrl && !removeCurrentImage && (
									<div className="mt-2 mb-2">
										<img src={previewUrl} alt="Current animal image" className="h-32 w-32 object-cover rounded shadow" />
									</div>
								)}
								{/* Show message if image marked for removal */}
								{removeCurrentImage && !selectedFile && (
									<p className="text-sm text-gray-500 dark:text-gray-400 italic mt-1 mb-2">Current image will be removed on save.</p>
								)}

								<input
									type="file"
									id="animalImage"
									accept="image/png, image/jpeg, image/webp, image/gif"
									ref={fileInputRef}
									onChange={handleFileChange}
									className={`block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sc-asparagus-50 dark:file:bg-sc-asparagus-900/30 file:text-sc-asparagus-700 dark:file:text-sc-asparagus-200 hover:file:bg-sc-asparagus-100 dark:hover:file:bg-sc-asparagus-900/50`}
								/>
								{/* Button to explicitly remove image */}
								{previewUrl && !removeCurrentImage && (
									<button type="button" onClick={handleRemoveImage} className="mt-1 text-xs text-red-600 hover:underline"> Remove Current Image </button>
								)}
								{isUploading && <p className="text-sm text-blue-600 mt-1">Uploading image...</p>}
							</div>

							{/* Story (Optional) */}
							<div>
								<label htmlFor="story" className={labelBaseClasses}>Story / Description</label>
								<textarea id="story" rows={4} {...register("story")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.story)} h-auto`} />
							</div>

							{/* Adoption Status */}
							<div>
								<label htmlFor="adoption_status" className={labelBaseClasses}>Adoption Status *</label>
								<select id="adoption_status" {...register("adoption_status", { required: "Status is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.adoption_status)}`}>
									{adoptionStatuses.map((status) => (
										<option key={status} value={status}>
											{status}
										</option>
									))}
								</select>
								{errors.adoption_status && <p className={errorTextClasses}>{errors.adoption_status.message}</p>}
							</div>
						</div>

						{/* Form Actions */}
						<div className="flex justify-end gap-3 pt-6 border-t border-gray-300 dark:border-gray-700 mt-6">
							<button
								type="button"
								disabled={isSubmitting || isUploading} // Use RHF submitting state
								onClick={onClose}
								className="bg-neutral-200 hover:bg-neutral-300 text-neutral-800 dark:bg-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-500 font-medium py-2 px-5 rounded-md transition duration-300"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isSubmitting || isUploading || !canSaveChanges} // Use RHF submitting state
								className="bg-sc-asparagus-500 hover:bg-sc-asparagus-600 text-white font-medium py-2 px-5 rounded-md transition duration-300 disabled:opacity-50" // Use theme color
							>
								{isSubmitting ? (
									<LoadingSpinner className="text-center w-5 h-5 mx-auto" /> // Show spinner
								) : (
									'Save Changes'
								)}
							</button>
						</div>
					</form>
				) : (
					// Success Message Area
					<div className="flex flex-col items-center justify-center text-center min-h-[200px]">
						<SuccessCheckmarkIcon />
						<h3 className="py-5 text-xl text-green-600 dark:text-green-400">Animal Added Successfully!</h3>
						<p className="text-gray-700 dark:text-gray-300 md:px-3">{submitMessage}</p>
						<button type="button" className="mt-6 text-sc-asparagus-600 dark:text-sc-asparagus-400 hover:underline focus:outline-none" onClick={() => {
							reset(); // Reset form state
							setIsSuccess(false); // Go back to form view
							setSubmitMessage("");
							onClose(); // Also close the modal
						}}>Add Another Animal or Close</button>
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
