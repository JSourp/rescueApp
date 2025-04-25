// src/app/admin/animals/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Container } from '@/components/Container';
import AddAnimalForm from '@/components/admin/AddAnimalForm';
import Modal from '@/components/Modal';
import { LoadingSpinner, PlusIcon, PencilSquareIcon, TrashIcon } from '@/components/Icons';
import { Animal } from '@/types/animal';
import { useUser } from '@auth0/nextjs-auth0/client'; // To check login state & potentially role later
import { getAuth0AccessToken } from '@/utils/auth'; // Import token helper
import { format } from 'date-fns'; // For formatting dates

// Define or import UserProfile type if fetching role
interface UserProfile { role?: string; /* other fields */ };

// --- Fetch function for ALL animals (or filtered/sorted) ---
async function fetchAdminAnimals(
	filters: { gender: string; animal_type: string; breed: string; adoption_status: string; }, // Allow filtering by status here too
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
	queryParams.append('sortBy', sortBy); // e.g., 'most_recent_update'

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

export default function AdminAnimalsPage() {
	// Auth state
	const { user, isLoading: isAuthLoading, error: authError } = useUser();

	// Data state
	const [animals, setAnimals] = useState<Animal[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	// Modal states
	const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
	// TODO: Add state for Edit/Delete modals and selected animal
	// const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
	// const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
	// const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);

	// Filter & Sort States
	const [genderFilter, setGenderFilter] = useState<string>('');
	const [animalTypeFilter, setAnimalTypeFilter] = useState<string>('');
	const [breedFilter, setBreedFilter] = useState<string>('');
	const [animalTypes, setAnimalTypes] = useState<string[]>([]);
	const [statusFilter, setStatusFilter] = useState<string>(''); // Add status filter state
	const [sortBy, setSortBy] = useState('most_recent_update'); // Default sort
	const sortingOptions = [
		{ value: 'most_recent_update', label: 'Most Recent Update' }, // Matched backend key
		{ value: 'least_recent_update', label: 'Least Recent Update' }, // Matched backend key
		{ value: 'name_asc', label: 'Name (A-Z)' }, // Matched backend key
		{ value: 'name_desc', label: 'Name (Z-A)' }, // Matched backend key
	];

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
	const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value);
	const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value);

	// --- Fetch Data Logic ---
	const loadAnimals = useCallback(async () => {
		if (isAuthLoading || authError) return; // Don't fetch if auth state isn't ready or has error

		setIsLoading(true);
		setError(null);
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
				adoption_status: statusFilter
			};
			const fetchedAnimals = await fetchAdminAnimals(filters, sortBy, token);
			setAnimals(fetchedAnimals);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load animals');
		} finally {
			setIsLoading(false);
		}
	}, [genderFilter, animalTypeFilter, breedFilter, statusFilter, sortBy, isAuthLoading, authError]); // Include all filter/sort states

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
		console.log("Edit clicked for:", animal.id);
		// setSelectedAnimal(animal);
		// setIsEditModalOpen(true);
		alert("Edit functionality not yet implemented."); // Placeholder
	};

	const handleDeleteClick = (animal: Animal) => {
		console.log("Delete clicked for:", animal.id);
		// setSelectedAnimal(animal);
		// setIsDeleteConfirmOpen(true);
		if (window.confirm(`Are you sure you want to delete ${animal.name}? This action is permanent!`)) {
			alert("Delete functionality not yet implemented."); // Placeholder
			// TODO: Implement call to DELETE /api/animals/{id}
			// handleConfirmDelete(animal.id);
		}
	};

	// --- TODO: Fetch user role for conditional button display ---
	// const [userRole, setUserRole] = useState<string | null>(null);
	// useEffect(() => { /* fetch /api/users/me and set userRole */ }, [user]);
	const userRole = user ? 'Admin' : 'Guest'; // !! TEMPORARY Placeholder - ASSUME ADMIN FOR TESTING !!

	// --- Styling Classes ---
	const thClasses = "px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800";
	const tdClasses = "px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700";
	const trClasses = "hover:bg-gray-100 dark:hover:bg-gray-700"; // Simple hover for all rows
	// For alternating colors:
	const trEvenClasses = "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700";
	const trOddClasses = "bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600";


	// --- Render Logic ---
	if (isAuthLoading) return <Container className="text-center py-10"><LoadingSpinner /> Loading User...</Container>;
	if (authError) return <Container className="text-center py-10 text-red-500">Authentication Error: {authError.message}</Container>;
	// Add page protection here later if Guests shouldn't see it at all

	return (
		<> {/* Fragment to allow multiple top-level elements (Container + Modal) */}
			<Container className="py-10">
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Manage Animals</h1>
					{/* Show Add button only to authorized roles */}
					{['Admin', 'Staff', 'Volunteer'].includes(userRole) && (
						<button
							onClick={handleAddAnimalClick}
							className="flex items-center gap-2 px-4 py-2 bg-sc-asparagus-500 hover:bg-sc-asparagus-600 text-white font-medium rounded-md shadow transition duration-300"
						>
							<PlusIcon className="w-5 h-5" />
							Add New Animal
						</button>
					)}
				</div>

				{/* Filtering Options UI */}
				<div className="flex flex-wrap items-center justify-center mb-6 gap-4">
					<select
						value={animalTypeFilter}
						onChange={handleAnimalTypeFilterChange}
						className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
					>
						<option value="">All Species</option>
						{animalTypes.map((type) => (
							<option key={type} value={type}>
								{type}
							</option>
						))}
					</select>
					<select
						value={genderFilter}
						onChange={handleGenderFilterChange}
						className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
					>
						<option value="">All Genders</option>
						<option value="Male">Male</option>
						<option value="Female">Female</option>
					</select>
					<select
						value={sortBy}
						onChange={handleSortChange}
						className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
					>
						{sortingOptions.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</div>

				{/* Loading / Error States */}
				{isLoading && (
					<div className="text-center py-10 text-gray-500 dark:text-gray-400">Loading Animals...</div>
				)}
				{error && (
					<div className="text-center py-10 text-red-500 dark:text-red-400">Error loading animals: {error}</div>
				)}

				{/* Animals Table */}
				{!isLoading && !error && (
					<div className="shadow border-b border-gray-200 dark:border-gray-700 sm:rounded-lg overflow-x-auto"> {/* Added overflow-x-auto */}
						<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
							<thead className="bg-gray-50 dark:bg-gray-800">
								<tr>
									<th scope="col" className={thClasses}>ID</th>
									<th scope="col" className={thClasses}>Name</th>
									<th scope="col" className={thClasses}>Species</th>
									<th scope="col" className={thClasses}>Breed</th>
									<th scope="col" className={thClasses}>Gender</th>
									<th scope="col" className={thClasses}>Status</th>
									<th scope="col" className={thClasses}>Date Added</th>
									<th scope="col" className={`${thClasses} text-right`}>Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
								{animals.length > 0 ? (
									animals.map((animal, index) => (
										// Basic hover, replace with alternating row classes if preferred
										<tr key={animal.id} className={trClasses /* index % 2 === 0 ? trEvenClasses : trOddClasses */}>
											<td className={tdClasses}>{animal.id}</td>
											<td className={tdClasses}>{animal.name}</td>
											<td className={tdClasses}>{animal.animal_type}</td>
											<td className={tdClasses}>{animal.breed}</td>
											<td className={tdClasses}>{animal.gender}</td>
											<td className={tdClasses}>{animal.adoption_status}</td>
											<td className={tdClasses}>{format(new Date(animal.date_added), 'P')}</td>
											<td className={`${tdClasses} text-right space-x-2`}>
												{/* Edit Button - Conditional */}
												{['Admin', 'Staff', 'Volunteer'].includes(userRole) && (
													<button
														onClick={() => handleEditClick(animal)}
														className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
														title="Edit"
													>
														<PencilSquareIcon className="w-5 h-5 inline" />
														<span className="sr-only">Edit</span>
													</button>
												)}
												{/* Delete Button - Conditional */}
												{userRole === 'Admin' && (
													<button
														onClick={() => handleDeleteClick(animal)}
														className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
														title="Delete"
													>
														<TrashIcon className="w-5 h-5 inline" />
														<span className="sr-only">Delete</span>
													</button>
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

			{/* Add Animal Modal */}
			{isAddModalOpen && (
				<Modal onClose={() => setIsAddModalOpen(false)}>
					<AddAnimalForm
						onClose={() => setIsAddModalOpen(false)}
						onAnimalAdded={handleAnimalAdded}
					/>
				</Modal>
			)}

			{/* TODO: Add Edit Animal Modal */}
			{/* {isEditModalOpen && selectedAnimal && ( ... <EditAnimalForm ... /> ... )} */}

			{/* TODO: Add Delete Confirmation Modal */}
			{/* {isDeleteConfirmOpen && selectedAnimal && ( ... <ConfirmDeleteModal ... /> ...)} */}

		</>
	);
}
