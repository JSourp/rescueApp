'use client'; // This component handles state and interaction

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/Container';
import { format, differenceInDays } from 'date-fns';
import { Animal } from '@/types/animal';
import { AnimalListItem } from '@/types/animalListItem';
import { UserProfile } from '@/types/userProfile';
import { AnimalDocument } from '@/types/animalDocument';
import { getAuth0AccessToken } from '@/utils/auth';
import {
	LoadingSpinner, PencilSquareIcon, TrashIcon, SuccessCheckmarkIcon, ArrowUturnLeftIcon,
	ExclamationTriangleIcon, DocumentArrowUpIcon, ArrowDownTrayIcon
} from '@/components/Icons';
import { calculateAge } from "@/components/data";
import EditAnimalForm from '@/components/admin/EditAnimalForm';
import ProcessReturnForm from '@/components/admin/ProcessReturnForm';
import FinalizeAdoptionForm from '@/components/admin/FinalizeAdoptionForm';
import ConfirmDeleteModal from '@/components/admin/ConfirmDeleteModal';
import DocumentUploadForm from '@/components/admin/DocumentUploadForm';
import Modal from '@/components/Modal';

// Define props received from the Server Component page
interface AdminAnimalDetailClientUIProps {
	initialAnimal: Animal;
	initialDocuments: AnimalDocument[];
	initialUserRole: string; // Role determined server-side
}

// Detail Item Helper Component
const DetailItem = ({ label, value }: { label: string; value: string | number | null | undefined }) => {
	if (value === null || value === undefined || value === '') return null;
	return (
		<div className="flex justify-between py-1">
			<dt className="text-gray-600 dark:text-gray-400 font-medium">{label}:</dt>
			<dd className="text-gray-900 dark:text-gray-100 text-right">{value}</dd>
		</div>
	);
};

export default function AdminAnimalDetailClientUI({
	initialAnimal,
	initialDocuments,
	initialUserRole
}: AdminAnimalDetailClientUIProps) {

	// Use initial data passed via props
	const [animals, setAnimals] = useState<AnimalListItem[]>([]);
	const [animal, setAnimal] = useState<Animal>(initialAnimal);
	const [documents, setDocuments] = useState<AnimalDocument[]>(initialDocuments);
	const [errorData, setErrorData] = useState<string | null>(null); // For API errors during actions
	const [currentUserRole] = useState<string>(initialUserRole); // Role is passed in

	// Modal states
	const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
	const [animalIdToEdit, setAnimalIdToEdit] = useState<number | null>(null); // Stores only the ID
	const [animalNameToEdit, setAnimalNameToEdit] = useState<string | null>(null); // Stores name for modal title
	const [isReturnModalOpen, setIsReturnModalOpen] = useState<boolean>(false);
	const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState<boolean>(false);
	const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
	const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
	const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(animal);
	const [selectedAnimalForAction, setSelectedAnimalForAction] = useState<Animal | null>(animal);
	const [isDeleting, setIsDeleting] = useState<boolean>(false);
	const [isFetchingLink, setIsFetchingLink] = useState<number | null>(null); // Store ID of doc being fetched
	const [linkError, setLinkError] = useState<string | null>(null);
	// --- NEW State for Document Deletion ---
	const [isDocDeleteConfirmOpen, setIsDocDeleteConfirmOpen] = useState<boolean>(false);
	const [selectedDocument, setSelectedDocument] = useState<AnimalDocument | null>(null);
	const [isDeletingDoc, setIsDeletingDoc] = useState<boolean>(false);
	const [deleteDocError, setDeleteDocError] = useState<string | null>(null);

	// --- Data Refresh Function ---
	const router = useRouter(); // Initialize router for refresh

	// Sync local 'documents' state when 'initialDocuments' prop changes after refresh
	useEffect(() => {
		console.log("InitialDocuments prop updated, setting local state.");
		setDocuments(initialDocuments);
	}, [initialDocuments]);

	const handleDataRefresh = () => {
		console.log("Refreshing animal data and documents...");
		router.refresh();
	};

	// --- Handlers  ---
	const handleEditClick = (animalItem: AnimalListItem) => { // animalItem is from your list
		setAnimalIdToEdit(animalItem.id);
		setAnimalNameToEdit(animalItem.name || 'Animal'); // Use name, or a default if name is null
		setIsEditModalOpen(true);
	};
	const handleCloseEditModal = () => {
		setIsEditModalOpen(false);
		setAnimalIdToEdit(null);
		setAnimalNameToEdit(null);
	};
	const handleAnimalUpdated = () => { setIsEditModalOpen(false); setSelectedAnimal(null); handleDataRefresh(); };
	const handleReturnClick = (animal: Animal) => { setSelectedAnimal(animal); setIsReturnModalOpen(true); };
	const handleReturnCompletion = () => { setIsReturnModalOpen(false); setSelectedAnimal(null); handleDataRefresh(); };
	const handleFinalizeClick = (animal: Animal) => { setSelectedAnimal(animal); setIsFinalizeModalOpen(true); };
	const handleAdoptionComplete = () => { setIsFinalizeModalOpen(false); setSelectedAnimal(null); handleDataRefresh(); };
	const handleDeleteClick = (animal: Animal) => { setSelectedAnimal(animal); setIsDeleteConfirmOpen(true); };
	const handleCloseDeleteConfirm = () => { setIsDeleteConfirmOpen(false); setSelectedAnimal(null); };

	const handleConfirmDelete = async (animalId: number) => {
		if (!animal || animalId !== animal.id) return;
		setIsDeleting(true); setErrorData(null);
		const token = await getAuth0AccessToken();
		if (!token) {
			setErrorData("Authentication error. Cannot delete."); // Show error in main area
			setIsDeleting(false);
			return;
		}
		try {
			const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
			const response = await fetch(`${apiBaseUrl}/animals/${animalId}`, {
				method: 'DELETE',
				headers: { 'Authorization': `Bearer ${token}` },
			});
			if (!response.ok) {
				let errorMsg = `Error ${response.status}: Failed to delete animal.`;
				try { const err = await response.json(); errorMsg = err.message || errorMsg; } catch (_) { }
				throw new Error(errorMsg);
			}
			// Success
			setIsDeleteConfirmOpen(false);
			setSelectedAnimal(null);
		} catch (err) {
			console.error("Delete error:", err);
			setErrorData(err instanceof Error ? err.message : 'Failed to delete animal');
			// Keep modal open to show error
		} finally {
			setIsDeleting(false);
		}
	};

	// Handle Document Download ---
	const handleDownloadClick = async (doc: AnimalDocument) => {
		setIsFetchingLink(doc.id); // Indicate which doc link is being fetched
		setLinkError(null);
		const token = await getAuth0AccessToken();
		if (!token) {
			setLinkError("Authentication token missing.");
			setIsFetchingLink(null);
			return;
		}
		try {
			const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
			const response = await fetch(`${apiBaseUrl}/documents/${doc.id}/download-url`, {
				headers: { 'Authorization': `Bearer ${token}` }
			});
			if (!response.ok) {
				let errorMsg = `Error ${response.status}`;
				try { const errBody = await response.json(); errorMsg = errBody.message || errorMsg; } catch (_) { }
				throw new Error(errorMsg);
			}
			const data = await response.json();
			if (data.downloadUrl) {
				// Open the temporary SAS URL in a new tab
				window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
			} else {
				throw new Error("Download URL not found in response.");
			}
		} catch (err) {
			console.error("Download link error:", err);
			setLinkError(err instanceof Error ? err.message : "Failed to get download link.");
		} finally {
			setIsFetchingLink(null);
		}
	};

	const handleDocumentUploaded = () => {
		setIsUploadModalOpen(false);
		handleDataRefresh();
	};

	// --- Handlers for Document Deletion ---
	const handleDeleteDocClick = (doc: AnimalDocument) => {
		setSelectedDocument(doc); // Set the document to delete
		setDeleteDocError(null); // Clear previous errors
		setIsDocDeleteConfirmOpen(true); // Open confirmation modal
	};

	const handleCloseDocDeleteConfirm = () => {
		setIsDocDeleteConfirmOpen(false);
		setSelectedDocument(null);
		setDeleteDocError(null); // Clear error on close
	};

	const handleConfirmDocDelete = async () => {
		if (!selectedDocument) return;

		setIsDeletingDoc(true);
		setDeleteDocError(null);
		const token = await getAuth0AccessToken();

		if (!token) {
			setDeleteDocError("Authentication error. Cannot delete document.");
			setIsDeletingDoc(false);
			return;
		}

		try {
			const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
			const url = `${apiBaseUrl}/documents/${selectedDocument.id}`;
			console.log(`Attempting to DELETE: ${url}`);

			const response = await fetch(url, {
				method: 'DELETE',
				headers: { 'Authorization': `Bearer ${token}` },
			});

			if (!response.ok) {
				// Handle non-JSON error responses specifically for 204
				if (response.status === 204) {
					// Success, but no content to parse, handled below
				} else {
					let errorMsg = `Error ${response.status}: Failed to delete document.`;
					try { const err = await response.json(); errorMsg = err.message || err.message; } catch (_) { }
					throw new Error(errorMsg);
				}
			}

			// Success (either 200 OK or 204 No Content)
			console.log(`Document ID ${selectedDocument.id} deleted successfully.`);

			// Update local state to remove the document immediately
			setDocuments(prevDocs => prevDocs.filter(d => d.id !== selectedDocument.id));

			// Close modal and clear selection
			handleCloseDocDeleteConfirm();

		} catch (err) {
			console.error("Delete document error:", err);
			const errorMsg = err instanceof Error ? err.message : 'Failed to delete document.';
			setDeleteDocError(errorMsg); // Show error within the modal
			// Keep modal open to show error
		} finally {
			setIsDeletingDoc(false);
		}
	};

	// --- Calculate derived state ---
	const daysWithUs = differenceInDays(new Date(), new Date(animal.dateCreated)); // Use correct field name
	const daysLabel = daysWithUs === 1 ? "day" : "days";

	return (
		<>
			<Container className="py-10">
				{/* --- Header Section --- */}
				<div className="mb-8">
					<Link href="/admin/manage-animals" className="text-sm text-text-link">&larr; Back to Manage Animals</Link>
					<h1 className="text-3xl font-bold mt-2 text-gray-900 dark:text-gray-100">
						{animal.name}
					</h1>
					<p className="text-lg text-gray-600 dark:text-gray-400 mt-1">Status: {animal.adoptionStatus}</p>
				</div>

				{/* Display potential API errors from actions */}
				{errorData && (
					<div className="mb-4 p-3 text-sm text-center text-red-700 bg-red-100 dark:text-red-200 dark:bg-red-900/30 border border-red-300 dark:border-red-600 rounded-md">
						<ExclamationTriangleIcon className="h-5 w-5 inline mr-1 align-text-bottom" /> Error: {errorData}
					</div>
				)}

				{/* --- Main Content Grid --- */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
					{/* Left Column: Image & Basic Info */}
					<div className="md:col-span-1 space-y-4">
						{animals.length > 0 ? (
							animals.map((animalItem, index) => (
								<div key={animalItem.id || index} className="aspect-square relative">
									{animalItem.primaryImageUrl ? (
										<Image
											src={animalItem.primaryImageUrl || '/placeholder-image.png'}
											alt={animalItem.name || ''}
											fill // Use fill for aspect ratio container
											className="object-cover rounded-lg shadow-md border dark:border-gray-700"
											priority // Prioritize image on detail page
										/>
									) : (
										<span className="text-gray-500 italic text-xs">No Image</span>
									)}
								</div>
							))
						) : (
							<tr>
								<td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
									No animals found.
								</td>
							</tr>
						)}
						{/* TODO: Add Edit Image Button/Flow Here */}
						<h2 className="text-xl font-semibold border-b pb-2 dark:border-gray-700">Details</h2>
						<dl className="space-y-2 text-sm">
							<DetailItem label="Species" value={animal.animalType} />
							<DetailItem label="Breed" value={animal.breed} />
							<DetailItem label="Gender" value={animal.gender} />
							<DetailItem label="Date of Birth" value={animal.dateOfBirth ? format(new Date(animal.dateOfBirth), 'PPP') : 'Unknown'} />
							<DetailItem label="Age" value={calculateAge(animal.dateOfBirth)} />
							<DetailItem label="Weight" value={animal.weight ? `${animal.weight} lbs` : 'N/A'} />
							<DetailItem label="Date Added" value={format(new Date(animal.dateCreated), 'PPP')} />
							<DetailItem label="Added By" value={animal.createdByUserId ?? '...'} />
							{/* TODO: Fix this - <DetailItem label="Time with us" value={daysWithUs} {daysLabel} /> */}
							<DetailItem label="Last Updated" value={format(new Date(animal.dateUpdated), 'PPP')} />
							<DetailItem label="Updated By" value={animal.updatedByUserId ?? '...'} />
						</dl>
					</div>

					{/* Right Column: Story, Actions, Documents */}
					<div className="md:col-span-2 space-y-8">
						{/* Story */}
						<div>
							<h2 className="text-xl font-semibold border-b pb-2 dark:border-gray-700 mb-3">Story</h2>
							<p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
								{animal.story || <span className="italic">No story provided.</span>}
							</p>
						</div>

						{/* Admin Actions */}
						<div>
							<h2 className="text-xl font-semibold border-b pb-2 dark:border-gray-700 mb-3">Admin Actions</h2>
							<div className="flex flex-wrap gap-4">
								{/* Edit Button - Conditional */}
								{['Admin', 'Staff'].includes(currentUserRole ?? '') && (
									<button onClick={() => handleEditClick(animal)} className="text-text-on-secondary bg-secondary-700 hover:bg-secondary-900 transition duration-300 rounded-md shadow py-3 px-6" title="Edit">
										<span className="flex items-center space-x-2">
											<PencilSquareIcon className="w-5 h-5 inline" />
											<span>Edit Details</span>
										</span>
									</button>
								)}

								{/* Process Return Button - Conditional */}
								{['Admin', 'Staff'].includes(currentUserRole ?? '') && ['Adopted'].includes(animal.adoptionStatus ?? '') && (
									<button onClick={() => handleReturnClick(animal)} className="text-text-on-primary bg-primary hover:bg-primary-800 transition duration-300 rounded-md shadow py-3 px-6" title="Process Return">
										<span className="flex items-center space-x-2">
											<ArrowUturnLeftIcon className="w-5 h-5 inline" />
											<span>Process Return</span>
										</span>
									</button>
								)}

								{/* Finalize Adoption Button - Conditional */}
								{['Admin', 'Staff'].includes(currentUserRole ?? '') && ['Available', 'Available - In Foster', 'Adoption Pending'].includes(animal.adoptionStatus ?? '') && (
									<button onClick={() => handleFinalizeClick(animal)} className="text-text-on-primary bg-primary hover:bg-primary-800 transition duration-300 rounded-md shadow py-3 px-6" title="Finalize Adoption">
										<span className="flex items-center space-x-2">
											<SuccessCheckmarkIcon className="w-5 h-5 inline" />
											<span>Finalize Adoption</span>
										</span>
									</button>
								)}

								{/* Delete Button - Conditional */}
								{currentUserRole === 'Admin' && (
									<button onClick={() => handleDeleteClick(animal)} className="text-text-on-accent bg-accent-700 hover:bg-accent-900 transition duration-300 rounded-md shadow py-3 px-6" title="Delete">
										<span className="flex items-center space-x-2">
											<TrashIcon className="w-5 h-5 inline" />
											<span>Delete Animal</span>
										</span>
									</button>
								)}
							</div>
						</div>

						{/* Documents Section */}
						<div>
							<h2 className="text-xl font-semibold border-b pb-2 dark:border-gray-700 mb-3">Documents</h2>
							{linkError && <p className="text-sm text-red-500 mb-2">Error fetching download link: {linkError}</p>}
							<div className="space-y-4">
								{/* Upload Button */}
								<div className="text-right">
									{['Admin', 'Staff'].includes(currentUserRole ?? '') && (
										<button onClick={() => setIsUploadModalOpen(true)} className="text-text-on-accent bg-accent-alt hover:bg-accent-alt-800 transition duration-300 rounded-md shadow py-3 px-6">
											<span className="flex items-center space-x-2">
												<DocumentArrowUpIcon className="w-5 h-5 inline" />
												<span>Upload Document</span>
											</span>
										</button>
									)}
								</div>

								{/* List Existing Documents */}
								{documents.length > 0 ? (
									<ul className="divide-y divide-gray-200 dark:divide-gray-700 border rounded-md dark:border-gray-700">
										{documents.map(doc => (
											<li key={doc.id} className="px-4 py-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/50">
												<div>
													<p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={doc.file_name}>
														{doc.file_name}
													</p>
													<p className="text-xs text-gray-500 dark:text-gray-400">
														Type: {doc.document_type}
													</p>
													<p className="text-xs text-gray-500 dark:text-gray-400">
														Uploaded: {doc.date_uploaded && typeof doc.date_uploaded === 'string'
															? format(new Date(doc.date_uploaded), 'PPP') // Format only if valid string
															: 'Invalid Date' // Fallback for null/undefined/invalid
														}
													</p>
												</div>
												<div className='flex items-center space-x-2 flex-shrink-0 ml-4'>
													<button
														onClick={() => handleDownloadClick(doc)}
														disabled={isFetchingLink === doc.id}
														className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 disabled:opacity-50"
														title="View/Download Document"
													>
														{isFetchingLink === doc.id ? (
															<LoadingSpinner className="w-5 h-5" />
														) : (
															<ArrowDownTrayIcon className="w-5 h-5" />
														)}
														<span className="sr-only">View/Download</span>
													</button>
													{/* Delete Document Button - Conditional */}
													{currentUserRole === 'Admin' && (
														<button onClick={() => handleDeleteDocClick(doc)}
															className="text-text-on-accent bg-accent-700 hover:bg-accent-900 transition duration-300 rounded-md shadow py-3 px-6"
															disabled={isDeletingDoc}
															title="Delete Document">
															<span className="flex items-center space-x-2">
																<TrashIcon className="w-5 h-5 inline" />
																<span>Delete Document</span>
															</span>
														</button>
													)}
												</div>
											</li>
										))}
									</ul>
								) : (
									<p className="text-sm text-center py-4 text-gray-500 dark:text-gray-400 italic">No documents uploaded for this animal yet.</p>
								)}
							</div>
						</div>
					</div>
				</div>
			</Container>

			{/* --- Modals --- */}
			{isEditModalOpen && animalIdToEdit !== null && ( // Ensure animalIdToEdit is not null
				<Modal onClose={handleCloseEditModal}>
					{/* Create EditAnimalForm component below */}
					<EditAnimalForm
						animalId={animalIdToEdit} // Pass the ID
						// Pass the initial name for display purposes in the form's header
						// The EditAnimalForm will then fetch its own full data
						initialAnimalName={animalNameToEdit}
						onClose={() => { setIsEditModalOpen(false); setSelectedAnimal(null); }}
						onAnimalUpdated={handleAnimalUpdated}
					/>
				</Modal>
			)}

			{isReturnModalOpen && selectedAnimal && (
				<Modal onClose={() => { setIsReturnModalOpen(false); setSelectedAnimal(null); }}>
					<ProcessReturnForm
						animal={selectedAnimal}
						onClose={() => { setIsReturnModalOpen(false); setSelectedAnimal(null); }}
						onReturnComplete={handleReturnCompletion}
					/>
				</Modal>
			)}

			{isFinalizeModalOpen && selectedAnimal && (
				<Modal onClose={() => { setIsFinalizeModalOpen(false); setSelectedAnimal(null); }}>
					{/* Create FinalizeAdoptionForm component below */}
					<FinalizeAdoptionForm
						animal={selectedAnimal}
						onClose={() => { setIsFinalizeModalOpen(false); setSelectedAnimal(null); }}
						onAdoptionComplete={handleAdoptionComplete}
					/>
				</Modal>
			)}

			{isDeleteConfirmOpen && selectedAnimal && (
				<Modal onClose={handleCloseDeleteConfirm}>
					{/* Create ConfirmDeleteModal component below */}
					<ConfirmDeleteModal
						itemType='animal'
						itemName={selectedAnimal.name ?? 'this animal'}
						onClose={handleCloseDeleteConfirm}
						onConfirmDelete={() => handleConfirmDelete(selectedAnimal.id)}
						isDeleting={isDeleting} // Pass deletion state
					/>
				</Modal>
			)}

			{isUploadModalOpen && animal && (
				<Modal onClose={() => setIsUploadModalOpen(false)}>
					<DocumentUploadForm
						animalId={animal.id}
						animalName={animal.name ?? undefined} // Pass name for display
						onClose={() => setIsUploadModalOpen(false)}
						onUploadComplete={handleDocumentUploaded}
					/>
				</Modal>
			)}

			{isDocDeleteConfirmOpen && selectedDocument && (
				<Modal onClose={handleCloseDocDeleteConfirm}>
					<ConfirmDeleteModal
						itemType='document'
						itemName={selectedDocument.file_name ?? 'this document'} // Use file_name
						onClose={handleCloseDocDeleteConfirm}
						onConfirmDelete={handleConfirmDocDelete} // Call the new handler
						isDeleting={isDeletingDoc} // Pass the specific deleting state
						errorMessage={deleteDocError} // Pass error message to display in modal
					/>
				</Modal>
			)}
			{/* --- End Modals --- */}
		</>
	);
}
