'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { useForm, SubmitHandler } from 'react-hook-form';
import { LoadingSpinner, TrashIcon, ArrowUturnLeftIcon, SuccessCheckmarkIcon, ExclamationTriangleIcon } from '@/components/Icons';
import { getAuth0AccessToken } from '@/utils/auth';
import { Animal } from '@/types/animal';
import { AnimalImage } from '@/types/animalImage'; // Import this type
import Image from 'next/image'; // Use Next.js Image for previews
import { adoptionStatuses } from '@/constants/adoptionStatuses';

// Form data only includes non-image fields now
interface EditAnimalFormData {
	animal_type: string;
	name: string;
	breed: string;
	date_of_birth?: string;
	gender: string;
	weight?: number | string;
	story?: string;
	adoption_status: string;
}

interface EditAnimalFormProps {
	animal: Animal;
	onClose: () => void;
	onAnimalUpdated: () => void;
}

export default function EditAnimalForm({ animal, onClose, onAnimalUpdated }: EditAnimalFormProps) {
	const [apiError, setApiError] = useState<string | null>(null);
	const [isUploading, setIsUploading] = useState<boolean>(false); // For image upload state
	// Store the CURRENT images associated with the animal
	const [currentImages, setCurrentImages] = useState<AnimalImage[]>(animal.animalImages || []);
	// Store NEW files selected for upload
	const [newFiles, setNewFiles] = useState<File[]>([]);
	// Store Data URLs for previewing NEW files
	const [newFilePreviews, setNewFilePreviews] = useState<string[]>([]);
	// Store IDs of existing images marked for DELETION
	const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);
	// Combined processing state
	const [isProcessing, setIsProcessing] = useState<boolean>(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

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
		}
	});

	// Reset form and image state when the animal prop changes
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
			// Reset image management state
			setCurrentImages(animal.animalImages || []);
			setNewFiles([]);
			setNewFilePreviews([]);
			setImagesToDelete([]);
			if (fileInputRef.current) fileInputRef.current.value = '';
		}
	}, [animal, reset]);

	const [isSuccess, setIsSuccess] = useState(false);
	const [submitMessage, setSubmitMessage] = useState("");

	// --- Image Handling Functions ---
	const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.files) {
			const filesArray = Array.from(event.target.files);
			// TODO: Add validation if needed (max number, size, type)
			setNewFiles(prev => [...prev, ...filesArray]);

			// Generate previews
			filesArray.forEach(file => {
				const reader = new FileReader();
				reader.onloadend = () => {
					setNewFilePreviews(prev => [...prev, reader.result as string]);
				}
				reader.readAsDataURL(file);
			});
		}
		// Clear the input visually so the same file can be selected again if removed
		if (fileInputRef.current) fileInputRef.current.value = '';
	};

	const handleRemoveNewFile = (indexToRemove: number) => {
		setNewFiles(prev => prev.filter((_, index) => index !== indexToRemove));
		setNewFilePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
	};

	const handleMarkImageForDelete = (imageId: number) => {
		// Add ID to delete list if not already there
		setImagesToDelete(prev => prev.includes(imageId) ? prev : [...prev, imageId]);
		// TODO: Visually hide or indicate deletion in the UI
		// Example: Dim the image by adding state or modifying currentImages locally (more complex)
		console.log("Marked image ID for deletion:", imageId);
	};

	const handleUndoMarkImageForDelete = (imageId: number) => {
		setImagesToDelete(prev => prev.filter(id => id !== imageId));
		console.log("Unmarked image ID for deletion:", imageId);
	};
	// --- End Image Handling Functions ---


	// --- Form Submission ---
	const handleUpdateAnimal: SubmitHandler<EditAnimalFormData> = async (formData) => {
		setApiError(null);
		setIsSuccess(false);
		setIsProcessing(true);
		setSubmitMessage("");

		// --- Get Access Token INSIDE the handler ---
		const accessToken = await getAuth0AccessToken(); // Use imported helper
		if (!accessToken) {
			setApiError("Authentication error. Could not get token.");
			return; // Stop submission if token fails
		}
		// --- Got Token ---

		let processError: string | null = null;
		let coreDataUpdated = false;

		try {
			// --- Step 1: Delete Marked Images ---
			if (imagesToDelete.length > 0) {
				console.log("Deleting images:", imagesToDelete);
				const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
				// Perform deletions sequentially or concurrently
				for (const imageId of imagesToDelete) {
					try {
						const response = await fetch(`${apiBaseUrl}/images/${imageId}`, {
							method: 'DELETE',
							headers: { 'Authorization': `Bearer ${accessToken}` },
						});
						if (!response.ok) {
							console.log(`Failed to delete image ${imageId}: ${response.statusText}`);
						} else {
							console.log(`Deleted image ${imageId}`);
						}
					} catch (delError) {
						console.log(delError, `Error deleting image ${imageId}`);
					}
				}
			}

			// --- Step 2: Upload New Images & Save Metadata ---
			const uploadedImageMetadata = []; // To store successful metadata results
			if (newFiles.length > 0) {
				console.log("Uploading new files:", newFiles.map(f => f.name));
				const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
				for (const file of newFiles) {
					let sasData: { sasUrl: string; blobName: string; blobUrl: string } | null = null;
					let uploadSuccessful = false;
					try {
						// 2a: Get SAS URL
						const filename = encodeURIComponent(file.name);
						const contentType = encodeURIComponent(file.type);
						const sasUrlResponse = await fetch(`${apiBaseUrl}/image-upload-url?filename=${filename}&contentType=${contentType}`, { /* ... headers ... */ });
						if (!sasUrlResponse.ok) throw new Error(`SAS URL Error (${sasUrlResponse.status})`);
						sasData = await sasUrlResponse.json();
						if (!sasData?.sasUrl) throw new Error("Invalid SAS response.");

						// 2b: Upload to Azure
						const uploadResponse = await fetch(sasData.sasUrl, { method: 'PUT', headers: { /*...*/ }, body: file });
						if (!uploadResponse.ok) throw new Error(`Upload Error (${uploadResponse.status})`);
						uploadSuccessful = true;

						// 2c: Save Metadata
						const metadataPayload = {
							document_type: "Animal Photo", // Fixed type for animal images
							file_name: file.name,
							blob_name: sasData.blobName,
							blob_url: sasData.blobUrl,
							caption: null, // Get caption from form if you add it
							is_primary: false, // Need logic to set primary (maybe first uploaded?)
							display_order: 0 // Need logic for ordering
						};
						const metadataResponse = await fetch(`${apiBaseUrl}/animals/${animal.id}/images`, { method: 'POST', headers: { /*...*/ }, body: JSON.stringify(metadataPayload) });
						if (!metadataResponse.ok) throw new Error(`Metadata Save Error (${metadataResponse.status})`);
						const savedMeta = await metadataResponse.json();
						uploadedImageMetadata.push(savedMeta); // Store for potential UI update

					} catch (uploadError: any) {
						console.error(`Failed to upload ${file.name}:`, uploadError);
						processError = `Failed to upload ${file.name}: ${uploadError.message}`;
						throw new Error(processError); // Throw to trigger main catch
					}
				}
			}


			// --- Step 3: Update Core Animal Data (if changed) ---
			if (isDirty) {
				console.log("Updating core animal data:", formData);
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

				const corePayload = {
					animal_type: submissionData.animal_type,
					name: submissionData.name,
					breed: submissionData.breed,
					date_of_birth: submissionData.date_of_birth,
					gender: submissionData.gender,
					weight: submissionData.weight,
					story: submissionData.story,
					adoption_status: submissionData.adoption_status,
				};

				const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
				const updateResponse = await fetch(`${apiBaseUrl}/animals/${animal.id}`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${accessToken}`,
					},
					body: JSON.stringify(corePayload)
				});
				if (!updateResponse.ok) {
					let errorMsg = `Error ${updateResponse.status}: Failed to update animal details.`;
					try {
				// Try to parse error from backend if response has body
						const errorBody = await updateResponse.json();
						errorMsg = errorBody.message || errorMsg;
					} catch (_) {
						errorMsg = `${updateResponse.status}: ${updateResponse.statusText}`; // Fallback
					}
					throw new Error(errorMsg);
				}
				coreDataUpdated = true;
				console.log('Core animal data updated successfully!');
				setIsSuccess(true);
				setSubmitMessage(`${submissionData.name} updated successfully!`);
			}


			// --- Final Success ---
			// Only call success if no errors occurred during image processing
			if (!processError) {
				onAnimalUpdated(); // Trigger parent refresh/close

				// Delay the form closure to let the user see the success message
				setTimeout(() => {
					onClose(); // Close the form after a delay
					setIsSuccess(false); // Optionally reset the success state
					setSubmitMessage(""); // Clear the success message
				}, 5000); // Adjust the delay time (e.g., 5000ms = 5 seconds)
			} else {
				// If core data saved but images failed, show partial success/error
				setApiError(processError + (coreDataUpdated ? " (Core details saved)." : ""));
			}

		} catch (error: any) {
			setIsSuccess(false); // Ensure success is false on error
			setSubmitMessage(error.message || "An unexpected error occurred."); // Use error state instead
			console.error("Update animal overall error:", error);
			setApiError(error.message || "An unknown error occurred during save.");
		} finally {
			setIsProcessing(false); // Reset processing flag
			setIsSuccess(false); // Optionally reset the success state
			setSubmitMessage(""); // Clear the success message
			setImagesToDelete([]); // Clear deletion list on attempt finish
			setNewFiles([]); // Clear new files on attempt finish
			setNewFilePreviews([]);
		}
	};

	// Check if any change requires saving
	const canSaveChanges = isDirty || newFiles.length > 0 || imagesToDelete.length > 0;

	// --- Styling classes ---
	const inputBaseClasses = "w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-primary-100 dark:focus:ring-primary-900 focus:border-primary-500 dark:focus:border-primary-500";
	const inputBorderClasses = (hasError: boolean) => hasError ? 'border-red-500 dark:border-red-600' : 'border-gray-300 dark:border-gray-600';
	const errorTextClasses = "text-red-500 dark:text-red-400 text-xs mt-1";
	const labelBaseClasses = "block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300";

	return (
		<div className="flex flex-col max-h-[85vh]">
			{/* Header */}
			<div className="flex-shrink-0 p-5 bg-primary-600">
				<h3 className="text-lg text-white text-center font-semibold">Edit {animal.name}</h3>
			</div>

			{/* Form Area - Scrollable */}
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

							{/* --- NEW Image Management Section --- */}
							<hr className="my-6 border-gray-300 dark:border-gray-600" />
							<h4 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Manage Images</h4>

							{/* Display Existing Images */}
							<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-4">
								{currentImages.map((img) => (
									<div key={img.id} className={`relative group border rounded ${imagesToDelete.includes(img.id) ? 'opacity-40 border-red-500' : 'border-transparent'}`}>
										<Image src={img.blobUrl} alt={img.caption || `Animal image ${img.id}`} width={100} height={100} className="object-cover rounded aspect-square" />
										{/* Delete Button Overlay */}
										{!imagesToDelete.includes(img.id) ? (
											<button
												type="button"
												onClick={() => handleMarkImageForDelete(img.id)}
												className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-700 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
												title="Mark for Deletion"
											>
												<TrashIcon className="w-4 h-4" />
											</button>
										) : (
											<button
												type="button"
												onClick={() => handleUndoMarkImageForDelete(img.id)}
												className="absolute top-1 right-1 bg-yellow-500/80 hover:bg-yellow-600 text-black p-1 rounded-full"
												title="Undo Mark for Deletion"
											>
												<ArrowUturnLeftIcon className="w-4 h-4" />
											</button>
										)}
										{/* TODO: Add button to mark as primary */}
									</div>
								))}
							</div>

							{/* Display New File Previews */}
							{newFilePreviews.length > 0 && (
								<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-4 border-t pt-4 dark:border-gray-700">
									{newFilePreviews.map((previewSrc, index) => (
										<div key={index} className="relative group border border-blue-300 rounded">
											<Image src={previewSrc} alt={`New file preview ${index + 1}`} width={100} height={100} className="object-cover rounded aspect-square" />
											{/* Remove Button Overlay */}
											<button
												type="button"
												onClick={() => handleRemoveNewFile(index)}
												className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-700 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
												title="Remove New File"
											>
												<TrashIcon className="w-4 h-4" />
											</button>
										</div>
									))}
								</div>
							)}

							{/* File Input for Adding New Images */}
							<div>
								<label htmlFor="animalImages" className={labelBaseClasses}>Add New Image(s)</label>
								<input
									type="file"
									id="animalImages"
									multiple // Allow multiple files
									accept="image/png, image/jpeg, image/webp, image/gif"
									ref={fileInputRef}
									onChange={handleFilesSelected}
									className={`block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 dark:file:bg-primary-900/30 file:text-primary-700 dark:file:text-primary-200 hover:file:bg-primary-100 dark:hover:file:bg-primary-900/50`}
								/>
								{isUploading && <p className="text-sm text-text-link mt-1"><LoadingSpinner className="inline w-4 h-4 mr-1" /> Uploading new images...</p>}
							</div>
							{/* --- End Image Management Section --- */}
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
								className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-5 rounded-md transition duration-300 disabled:opacity-50" // Use theme color
							>
								{isSubmitting ? (
									<LoadingSpinner className="text-center w-5 h-5 mx-auto" /> // Show spinner
								) : (
									'Save Changes'
								)}
							</button>
						</div>

						{/* Display General API Error */}
						{apiError && (
							<p className="mb-4 p-3 text-sm text-center text-red-700 bg-red-100 dark:text-red-200 dark:bg-red-900/30 border border-red-300 dark:border-red-600 rounded-md">
								<ExclamationTriangleIcon className="h-5 w-5 inline mr-1 align-text-bottom" /> Error: {apiError}
							</p>
						)}
					</form>
				) : (
					// Success Message Area
					<div className="flex flex-col items-center justify-center text-center min-h-[200px]">
						<SuccessCheckmarkIcon />
						<h3 className="py-5 text-xl text-green-600 dark:text-green-400">Animal Added Successfully!</h3>
						<p className="text-gray-700 dark:text-gray-300 md:px-3">{submitMessage}</p>
							<button type="button" className="mt-6 text-primary-600 dark:text-primary-400 hover:underline focus:outline-none" onClick={() => {
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
