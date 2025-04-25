'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Container } from '@/components/Container';
import AddAnimalForm from '@/components/admin/AddAnimalForm';
import EditAnimalForm from '@/components/admin//EditAnimalForm';
import ConfirmDeleteModal from '@/components/admin/ConfirmDeleteModal';
import Modal from '@/components/Modal';
import { LoadingSpinner, PlusIcon, PencilSquareIcon, TrashIcon } from '@/components/Icons';
import { Animal } from '@/types/animal';
import { UserProfile } from '@/types/userProfile';
import { useUser } from '@auth0/nextjs-auth0/client'; // To check login state & potentially role later
import { getAuth0AccessToken } from '@/utils/auth'; // Import token helper
import { format } from 'date-fns'; // For formatting dates
import { adoptionStatuses } from '@/constants/adoptionStatuses'; // Import list of statuses

// Define the type for the filters object passed to the fetch function
interface AdminAnimalFilters {
	gender: string;
	animal_type: string;
	breed: string;
	adoption_status: string[];
}

// --- Fetch function for ALL animals (or filtered/sorted) ---
async function fetchAdminAnimals(
	filters: AdminAnimalFilters, // Allow filtering by status here too
	sortBy: string,
	accessToken: string | null
): Promise<Animal[]> {
	if (!accessToken) {
		console.error("fetchAdminAnimals: No access token provided.");
		throw new Error("Authentication token is missing.");
	}
	const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
	const endpoint = `${apiBaseUrl}/animals`;
	const queryParams = new URLSearchParams();

	// Append filters IF they have a value
	if (filters.gender) queryParams.append('gender', filters.gender);
	if (filters.animal_type) queryParams.append('animal_type', filters.animal_type);
	if (filters.breed) queryParams.append('breed', filters.breed);
	if (sortBy) queryParams.append('sortBy', sortBy); // Pass sortBy

	// Handle array of statuses
	if (filters.adoption_status && filters.adoption_status.length > 0) {
		// Join the array into a comma-separated string.
		// Backend expects comma-separated and handles decoding of individual statuses.
		queryParams.append('adoption_status', filters.adoption_status.join(','));
	}

	const url = `${endpoint}?${queryParams.toString()}`;
	console.log("Fetching animals from URL:", url);

	try {
		const response = await fetch(url, {
			headers: { 'Authorization': `Bearer ${accessToken}` },
			cache: 'no-store'
		});
		if (!response.ok) {
			throw new Error(`API Error: ${response.status} ${response.statusText}`);
		}
		const data = await response.json();
		return data as Animal[];
	} catch (error) {
		console.error('Error fetching admin animals:', error);
		throw error;
	}
}

// Helper to fetch animal types
async function fetchAnimalTypes(): Promise<string[]> {
	const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
	try {
		// Assuming /animals/types endpoint exists and returns string[]
		const response = await fetch(`${apiBaseUrl}/animals/types`, { cache: 'no-store' });
		if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
		const data = await response.json();
		return Array.isArray(data) ? data.map(String) : [];
	} catch (error) {
		console.error('Error fetching animal types:', error);
		return [];
	}
}

async function fetchCurrentUserProfile(accessToken: string | null): Promise<UserProfile | null> {
	if (!accessToken) return null;
	const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
	try {
		const response = await fetch(`${apiBaseUrl}/users/me`, {
			headers: { 'Authorization': `Bearer ${accessToken}` },
			cache: 'no-store'
		});
		if (!response.ok) {
			console.error(`API Error fetching user profile: ${response.status}`);
			return null;
		}
		return await response.json() as UserProfile;
	} catch (error) {
		console.error("Error fetching user profile:", error);
		return null;
	}
}

export default function AdminAnimalsPage() {
	// Auth state
	const { user: auth0User, isLoading: isAuthLoading, error: authError } = useUser();

	// Data state
	const [animals, setAnimals] = useState<Animal[]>([]);
	const [isLoadingData, setIsLoading] = useState<boolean>(true); // For animal list
	const [errorData, setError] = useState<string | null>(null);

	// State for Modals and Selected Animal
	const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
	const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
	const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
	const [isDeleting, setIsDeleting] = useState<boolean>(false); // Loading state for delete

	// State for User Role
	const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
	const [isLoadingRole, setIsLoadingRole] = useState<boolean>(true);

	// Filter & Sort States
	const [genderFilter, setGenderFilter] = useState<string>('');
	const [animalTypeFilter, setAnimalTypeFilter] = useState<string>('');
	const [breedFilter, setBreedFilter] = useState<string>('');
	const [animalTypes, setAnimalTypes] = useState<string[]>([]);
	const [statusFilters, setStatusFilters] = useState<string[]>([]);
	const [sortBy, setSortBy] = useState('date_added_desc');
	const sortingOptions = [
		{ value: 'date_added_desc', label: 'Date Added' }, // Default sort
		{ value: 'most_recent_update', label: 'Most Recent Update' }, // Matched backend key
		{ value: 'least_recent_update', label: 'Least Recent Update' }, // Matched backend key
		{ value: 'name_asc', label: 'Name (A-Z)' }, // Matched backend key
		{ value: 'name_desc', label: 'Name (Z-A)' }, // Matched backend key
	];

	// Fetch User Role Effect
	useEffect(() => {
		const loadUserRole = async () => {
			// Don't fetch role until auth0 loading is done and user object exists
			if (isAuthLoading || !auth0User) {
				setIsLoadingRole(isAuthLoading); // Reflect auth loading status
				if (!isAuthLoading && !auth0User) setCurrentUserRole("Guest"); // Assume Guest if not logged in after load
				return;
			}
			setIsLoadingRole(true);
			const token = await getAuth0AccessToken();
			const profile = await fetchCurrentUserProfile(token);
			setCurrentUserRole(profile?.role ?? "Guest"); // Set role or default to Guest
			setIsLoadingRole(false);
		};
		loadUserRole();
	}, [auth0User, isAuthLoading]); // Rerun when auth state changes

	// Fetch animal types
	useEffect(() => {
		async function loadTypes() {
			const types = await fetchAnimalTypes();
			setAnimalTypes(types);
		}
		loadTypes();
	}, []);

	// --- Handlers ---
	const handleAnimalTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => setAnimalTypeFilter(e.target.value);
	const handleGenderFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => setGenderFilter(e.target.value);
	const handleBreedFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => setBreedFilter(e.target.value);
	const handleStatusFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const { value, checked } = event.target;
		setStatusFilters(prev =>
			checked
				? [...prev, value] // Add status if checked
				: prev.filter(status => status !== value) // Remove status if unchecked
		);
	};
	const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value);

	// --- Fetch Data Logic ---
	const loadAnimals = useCallback(async () => {
		if (isAuthLoading || authError) return; // Don't fetch if auth state isn't ready or has error

		setError(null);
		setIsLoading(true);
		const token = await getAuth0AccessToken(); // Get token on each fetch

		if (!token) {
			// If not logged in, technically shouldn't reach here if page is protected later
			// But handle case where token fetch fails
			setError("Authentication token missing. Cannot load animals.");
			setIsLoading(false);
			return;
		}

		try {
			const filters = {
				gender: genderFilter,
				animal_type: animalTypeFilter,
				breed: breedFilter,
				adoption_status: statusFilters
			};
			const fetchedAnimals = await fetchAdminAnimals(filters, sortBy, token);
			setAnimals(fetchedAnimals);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load animals');
		} finally {
			setIsLoading(false);
		}
	}, [genderFilter, animalTypeFilter, breedFilter, statusFilters, sortBy, isAuthLoading, authError]); // Include all filter/sort states

	// Initial data load and reload on filter/sort changes
	useEffect(() => {
		loadAnimals();
	}, [loadAnimals]); // Run loadAnimals when filters/sort change (captured by useCallback dependencies)


	// Handlers for Modals and Refetching
	const handleAddAnimalClick = () => {
		setIsAddModalOpen(true);
	};

	const handleAnimalAdded = () => {
		setIsAddModalOpen(false); // Close modal
		loadAnimals(); // Refresh the list
	};

	const handleEditClick = (animal: Animal) => {
		setSelectedAnimal(animal);
		setIsEditModalOpen(true);
	};

	const handleAnimalUpdated = () => {
		setIsEditModalOpen(false);
		setSelectedAnimal(null);
		loadAnimals(); // Refresh list
	};

	const handleDeleteClick = (animal: Animal) => {
		setSelectedAnimal(animal);
		setIsDeleteConfirmOpen(true);
	};
	const handleCloseDeleteConfirm = () => {
		setIsDeleteConfirmOpen(false);
		setSelectedAnimal(null);
	};

	const handleConfirmDelete = async (animalId: number) => {
		if (!selectedAnimal || animalId !== selectedAnimal.id) return;
		setIsDeleting(true);
		const token = await getAuth0AccessToken();
		if (!token) {
			setError("Authentication error. Cannot delete."); // Show error in main area
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
			loadAnimals(); // Refresh list
		} catch (err) {
			console.error("Delete error:", err);
			setError(err instanceof Error ? err.message : 'Failed to delete animal');
			// Keep modal open to show error? Or close and show error on page?
			// For now, let's keep modal open, user needs to cancel.
		} finally {
			setIsDeleting(false);
		}
	};

	// Styling classes
	const thClasses = "px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800";
	const tdClasses = "px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700";
	// Alternating rows:
	const trEvenClasses = "bg-white dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50";
	const trOddClasses = "bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-700";

	// Render Logic
	// Handle Auth0 errors first
	if (authError) return <Container className="text-center py-10 text-red-500">Authentication Error: {authError.message}</Container>;
	// Show main loading state only while Auth0 or Role is loading initially
	if (isAuthLoading || isLoadingRole) return <Container className="text-center py-10"><LoadingSpinner /> Loading User Access...</Container>;

	return (
		<> {/* Fragment to allow multiple top-level elements (Container + Modal) */}
			<Container className="py-10">
				{/* Main Title - Centered */}
				<div className="text-center mb-4"> {/* Center only the title, adjust margin if needed */}
					<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
						Manage Animals
					</h1>
				</div>

				{/* Add Animal Button - Right Aligned */}
				{/* Conditionally render this div only if the user has the correct role */}
				{['Admin', 'Staff', 'Volunteer'].includes(currentUserRole ?? '') && (
					<div className="flex justify-end mb-6"> {/* Use flexbox to push content to the end (right), add margin below */}
						<button
							onClick={handleAddAnimalClick}
							// Re-apply button styling (using Asparagus theme from AddAnimalForm)
							className="inline-flex items-center gap-2 px-4 py-2 bg-sc-asparagus-500 hover:bg-sc-asparagus-600 text-white font-medium rounded-md shadow transition duration-300"
						>
							<PlusIcon className="w-5 h-5" />
							<span>Add New Animal</span> {/* Explicit span for text */}
						</button>
					</div>
				)}

				{/* Filtering/Sorting Controls */}
				<div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow">
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
						{/* Animal Type */}
						<div>
							<label htmlFor="typeFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Species</label>
							<select id="typeFilter" value={animalTypeFilter} onChange={handleAnimalTypeFilterChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm">
								<option value="">All Species</option>
								{animalTypes.map(type => (<option key={type} value={type}>{type}</option>))}
							</select>
						</div>
						{/* Gender */}
						<div>
							<label htmlFor="genderFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
							<select id="genderFilter" value={genderFilter} onChange={handleGenderFilterChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm">
								<option value="">All Genders</option>
								<option value="Male">Male</option>
								<option value="Female">Female</option>
								<option value="Unknown">Unknown</option>
							</select>
						</div>
						{/* Sort By */}
						<div>
							<label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort By</label>
							<select id="sortBy" value={sortBy} onChange={handleSortChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm">
								{sortingOptions.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
							</select>
						</div>
						{/* Status Filter (Checkboxes) */}
						<div className="sm:col-span-2 md:col-span-1"> {/* Adjust span as needed */}
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
							<div className="max-h-40 overflow-y-auto p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 space-y-1">
								{adoptionStatuses.map((status) => (
									<div key={status} className="flex items-center">
										<input
											type="checkbox"
											id={`status-${status.replace(/\s+/g, '-')}`}
											value={status}
											checked={statusFilters.includes(status)} // Check if status is in the array
											onChange={handleStatusFilterChange} // Use the new handler
											className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-500 rounded focus:ring-indigo-500 dark:bg-gray-600"
										/>
										<label htmlFor={`status-${status.replace(/\s+/g, '-')}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300">{status}</label>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>

				{/* Data Loading/Error Display */}
				{isLoadingData && <div className="text-center py-10"><LoadingSpinner /> Loading animals...</div>}
				{errorData && <div className="text-center py-10 text-red-500">Error loading animals: {errorData}</div>}

				{/* --- Row Count Display --- */}
				{!isLoadingData && !errorData && (
					<div className="mb-2 text-sm text-right text-gray-600 dark:text-gray-400">
						Displaying {animals.length} animal(s)
						{/* TODO: Add logic here later if API provides total count */}
						{/* e.g., {totalCount ? ` of ${totalCount}` : ''} */}
					</div>
				)}
				{/* --- End Row Count --- */}

				{/* Animals Table */}
				{!isLoadingData && !errorData && (
					<div className="shadow border-b border-gray-200 dark:border-gray-700 sm:rounded-lg overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
							<thead>
								<tr>
									<th className={thClasses}>Image</th>
									<th className={thClasses}>Name</th>
									<th className={thClasses}>Type</th>
									<th className={thClasses}>Breed</th>
									<th className={thClasses}>Adoption Status</th>
									<th className={thClasses}>Gender</th>
									<th className={thClasses}>Date of Birth</th>
									<th className={thClasses}>Weight</th>
									<th className={thClasses}>Story</th>
									<th className={thClasses}>Date Added</th>
									<th className={thClasses}>Last Updated</th>
									<th className={`${thClasses} text-right`}>Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
								{animals.length > 0 ? (
									animals.map((animal, index) => (
										<tr key={animal.id} className={index % 2 === 0 ? trEvenClasses : trOddClasses}>
											<td className={tdClasses}>
												{animal.image_url ? (
													<img
														src={animal.image_url}
														className="w-10 h-10 object-cover rounded"
													/>
												) : (
													<span className="text-gray-500 italic">No Image</span>
												)}
											</td>
											<td className={tdClasses}>{animal.name ? `${animal.name}` : 'N/A'}</td>
											<td className={tdClasses}>{animal.animal_type ? `${animal.animal_type}` : 'N/A'}</td>
											<td className={tdClasses}>{animal.breed ? `${animal.breed}` : 'N/A'}</td>
											<td className={tdClasses}>{animal.adoption_status ? `${animal.adoption_status}` : 'N/A'}</td>
											<td className={tdClasses}>{animal.gender ? `${animal.gender}` : 'N/A'}</td>
											<td className={tdClasses}>{animal.date_of_birth ? format(new Date(animal.date_of_birth), 'P') : 'N/A'}</td>
											<td className={tdClasses}>{animal.weight ? `${animal.weight} lbs` : 'N/A'}</td>
											<td className={`${tdClasses} max-w-xs`}>
												<div className="overflow-hidden overflow-ellipsis whitespace-nowrap" title={animal.story}>
													{animal.story ? animal.story : 'N/A'}
												</div>
											</td>
											<td className={tdClasses}>{format(new Date(animal.date_added), 'P')}</td>
											<td className={tdClasses}>{format(new Date(animal.date_updated), 'P')}</td>
											<td className={`${tdClasses} text-right space-x-2`}>
												{/* Edit Button - Conditional */}
												{['Admin', 'Staff', 'Volunteer'].includes(currentUserRole ?? '') && (
													<button onClick={() => handleEditClick(animal)} className="..." title="Edit"> <PencilSquareIcon className="w-5 h-5 inline" /> <span className="sr-only">Edit</span> </button>
												)}
												{/* Delete Button - Conditional */}
												{currentUserRole === 'Admin' && (
													<button onClick={() => handleDeleteClick(animal)} className="..." title="Delete"> <TrashIcon className="w-5 h-5 inline" /> <span className="sr-only">Delete</span> </button>
												)}
											</td>
										</tr>
									))
								) : (
									<tr>
										<td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
											No animals found.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				)}
			</Container>

			{/* --- Modals --- */}
			{isAddModalOpen && (
				<Modal onClose={() => setIsAddModalOpen(false)}>
					<AddAnimalForm onClose={() => setIsAddModalOpen(false)} onAnimalAdded={handleAnimalAdded} />
				</Modal>
			)}

			{isEditModalOpen && selectedAnimal && (
				<Modal onClose={() => { setIsEditModalOpen(false); setSelectedAnimal(null); }}>
					{/* Create EditAnimalForm component below */}
					<EditAnimalForm
						animal={selectedAnimal}
						onClose={() => { setIsEditModalOpen(false); setSelectedAnimal(null); }}
						onAnimalUpdated={handleAnimalUpdated}
					/>
				</Modal>
			)}

			{isDeleteConfirmOpen && selectedAnimal && (
				<Modal onClose={handleCloseDeleteConfirm}>
					{/* Create ConfirmDeleteModal component below */}
					<ConfirmDeleteModal
						animalName={selectedAnimal.name ?? 'this animal'}
						onClose={handleCloseDeleteConfirm}
						onConfirmDelete={() => handleConfirmDelete(selectedAnimal.id)}
						isDeleting={isDeleting} // Pass deletion state
					/>
				</Modal>
			)}
			{/* --- End Modals --- */}
		</>
	);
}
