// src/components/admin/DocumentUploadForm.tsx
'use client';

import React, { useState, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { LoadingSpinner, SuccessCheckmarkIcon, ExclamationTriangleIcon, DocumentArrowUpIcon } from '@/components/Icons';
import { getAuth0AccessToken } from '@/utils/auth';

// Define the types of documents users can upload
const document_types = [
	'Vaccination Record',
	'Spay/Neuter Certificate',
	'Microchip Record',
	'Vet Record',
	'Intake Form',
	'Behavioral Assessment',
	'Photo ID',
	'Other'
];

// Form data includes metadata fields (file handled separately)
interface DocumentFormData {
	documentType: string;
	description?: string;
}

interface DocumentUploadFormProps {
	animalId: number; // ID of the animal the doc belongs to
	animalName?: string; // Optional: For display
	onClose: () => void;
	onUploadComplete: () => void; // To refresh document list
}

export default function DocumentUploadForm({ animalId, animalName, onClose, onUploadComplete }: DocumentUploadFormProps) {
	const [apiError, setApiError] = useState<string | null>(null);
	const [isSuccess, setIsSuccess] = useState<boolean>(false);
	const [isUploading, setIsUploading] = useState<boolean>(false); // For combined process
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting }, // isSubmitting from RHF for metadata submit part
	} = useForm<DocumentFormData>({
		mode: 'onTouched',
		defaultValues: { documentType: '', description: '' },
	});

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setApiError(null); // Clear error when new file selected
		if (event.target.files && event.target.files[0]) {
			// TODO: Add file size validation here if desired
			setSelectedFile(event.target.files[0]);
		} else {
			setSelectedFile(null);
		}
	};

	const handleUploadAndSubmit: SubmitHandler<DocumentFormData> = async (metadataFormData) => {
		if (!selectedFile) {
			setApiError("Please select a file to upload.");
			return;
		}
		if (isUploading) return; // Prevent double submit

		setApiError(null);
		setIsUploading(true); // Set overall processing state

		const accessToken = await getAuth0AccessToken();
		if (!accessToken) {
			setApiError("Authentication error. Could not get token.");
			setIsUploading(false);
			return;
		}

		let sasData: { sasUrl: string; blob_name: string; blob_url: string } | null = null;
		let uploadSuccessful = false;

		try {
			// 1. Get SAS URL
			const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
			if (!apiBaseUrl) {
				throw new Error("API Base URL environment variable is not configured.");
			}
			// Ensure animalId is passed correctly as a prop to this component
			if (!animalId) {
				throw new Error("Animal ID is missing.");
			}
			const file_name = encodeURIComponent(selectedFile!.name);
			const contentType = encodeURIComponent(selectedFile!.type);

			const urlToFetch = `${apiBaseUrl}/animals/${animalId}/document-upload-url?file_name=${file_name}&contentType=${contentType}`;

			console.log("Requesting SAS URL from:", urlToFetch); // Log the URL before fetching

			const sasUrlResponse = await fetch(urlToFetch, { // Use the constructed URL
				headers: { 'Authorization': `Bearer ${accessToken}` }
			});

			if (!sasUrlResponse.ok) throw new Error(`Failed to get upload URL (${sasUrlResponse.status})`);
			sasData = await sasUrlResponse.json();
			if (!sasData || !sasData.sasUrl || !sasData.blob_name || !sasData.blob_url) throw new Error("Invalid SAS response from server.");

			// 2. Upload file to Azure Blob Storage
			console.log("Uploading to Azure Blob Storage...");
			const uploadResponse = await fetch(sasData.sasUrl, {
				method: 'PUT',
				headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': selectedFile.type },
				body: selectedFile
			});
			if (!uploadResponse.ok) throw new Error(`Failed to upload file to Azure (${uploadResponse.status})`);
			uploadSuccessful = true;
			console.log("File upload successful. Blob Name:", sasData.blob_name);

			// 3. Save Metadata to your backend API
			const metadataPayload = {
				// Match the backend DTO (CreateDocumentMetadataRequest) - needs PascalCase
				documentType: metadataFormData.documentType,
				fileName: selectedFile.name, // Use original file_name
				blobName: sasData.blob_name, // Use unique name from SAS response
				blobUrl: sasData.blob_url, // Use base blob URL from SAS response
				description: metadataFormData.description || null
			};

			console.log("Saving document metadata:", metadataPayload);
			const metadataResponse = await fetch(`${apiBaseUrl}/animals/${animalId}/documents`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${accessToken}`,
				},
				body: JSON.stringify(metadataPayload),
			});

			if (!metadataResponse.ok) {
				let errorMsg = `Error ${metadataResponse.status}: Failed to save document metadata.`;
				try { const errBody = await metadataResponse.json(); errorMsg = errBody.message || errorMsg; } catch (_) { }
				// Attempt to clean up orphaned blob if metadata save fails? Optional.
				console.error("Metadata save failed, potentially leaving orphaned blob:", sasData.blob_name);
				throw new Error(errorMsg);
			}

			// If all steps succeeded
			setIsSuccess(true);
			console.log("Document metadata saved successfully!");
			reset(); // Reset form fields
			setSelectedFile(null); // Clear selected file state
			if (fileInputRef.current) fileInputRef.current.value = ''; // Clear file input visually
			onUploadComplete(); // Notify parent to refresh list

			// Close modal after a short delay showing success
			setTimeout(() => { onClose(); }, 2000);

		} catch (error: any) {
			console.error("Document upload process error:", error);
			setApiError(error.message || "An unknown error occurred during upload.");
			setIsSuccess(false);
			// TODO: Consider deleting the blob if metadata save failed
		} finally {
			setIsUploading(false);
		}
	};

	// --- TODO: Update this styling. Base styling classes (use a suitable theme color, e.g., blue) ---
	const inputBaseClasses = "w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-500 dark:focus:border-blue-500";
	const inputBorderClasses = (hasError: boolean) => hasError ? 'border-red-500 dark:border-red-600' : 'border-gray-300 dark:border-gray-600';
	const errorTextClasses = "text-red-500 dark:text-red-400 text-xs mt-1";
	const labelBaseClasses = "block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300";

	return (
		<div className="flex flex-col max-h-[85vh]">
			{/* Header */}
			<div className="flex-shrink-0 p-5 bg-blue-600 text-white">
				<h3 className="text-lg text-center font-semibold">Upload Document for {animalName || `Animal ID ${animalId}`}</h3>
			</div>

			{/* Form Area */}
			<div className="flex-grow p-6 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
				{!isSuccess ? (
					<form onSubmit={handleSubmit(handleUploadAndSubmit)} noValidate>
						<div className="space-y-4">
							{/* File Input */}
							<div>
								<label htmlFor="documentFile" className={labelBaseClasses}>Select File *</label>
								<input
									type="file"
									id="documentFile"
									required // Make file selection required by HTML5
									accept=".pdf, image/jpeg, image/png, .doc, .docx, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document" // Specify accepted types
									ref={fileInputRef}
									onChange={handleFileChange}
									className={`block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-200 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50`}
								/>
								{/* Show selected file_name */}
								{selectedFile && <p className="text-xs text-gray-500 mt-1">Selected: {selectedFile.name}</p>}
								{/* RHF doesn't easily validate file inputs, rely on isRequired + selectedFile check */}
							</div>

							{/* Document Type */}
							<div>
								<label htmlFor="document_type" className={labelBaseClasses}>Document Type *</label>
								<select id="document_type" {...register("documentType", { required: "Document type is required" })} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.documentType)}`}>
									<option value="">Select Type...</option>
									{document_types.map(type => (
										<option key={type} value={type}>{type}</option>
									))}
								</select>
								{errors.documentType && <p className={errorTextClasses}>{errors.documentType.message}</p>}
							</div>

							{/* Description */}
							<div>
								<label htmlFor="description" className={labelBaseClasses}>Description (Optional)</label>
								<textarea id="description" rows={3} {...register("description")} className={`${inputBaseClasses} ${inputBorderClasses(!!errors.description)} h-auto`} placeholder="Add any relevant notes about this document..." />
							</div>
						</div>

						{/* Form Actions */}
						<div className="flex justify-end gap-3 pt-6 border-t border-gray-300 dark:border-gray-700 mt-6">
							<button
								type="button"
								disabled={isSubmitting || isUploading} // Use RHF submitting state
								onClick={onClose}
								className="bg-neutral-200 hover:bg-neutral-300 text-neutral-800 dark:bg-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-500 font-medium py-2 px-5 rounded-md transition duration-300">
								Cancel
							</button>
							<button
								type="submit"
								disabled={!selectedFile || isSubmitting || isUploading} // Use RHF submitting state
								className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-5 rounded-md transition duration-300 disabled:opacity-50">
								{(isUploading || isSubmitting) ? (
									<LoadingSpinner className="text-center w-5 h-5 mx-auto" />
								) : (
									'Upload Document'
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
					// Success Message
					<div className="flex flex-col items-center justify-center text-center min-h-[200px]">
						<SuccessCheckmarkIcon className="h-16 w-16 text-green-500" />
						<h3 className="py-5 text-xl text-green-600 dark:text-green-400 font-semibold">Document Uploaded!</h3>
						<p className="text-gray-700 dark:text-gray-300">The document metadata has been saved.</p>
						{/* Automatically closes after timeout in handler */}
					</div>
				)}

			</div>
		</div>
	);
}
