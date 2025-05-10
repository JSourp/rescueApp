'use client';

import React, { useState, useEffect } from 'react';
import { Container } from '@/components/Container';
import { Animal } from '@/types/animal';
import Image from 'next/image';
import Link from 'next/link';
import { InformationCircleIcon, GraduationCapIcon } from "@/components/Icons";
import { format } from 'date-fns';

// Define interface for the data returned by the /api/graduates endpoint
interface Graduate extends Animal {
	id: number;
	name?: string | null;
	imageUrl?: string | null;
	animalType?: string | null;
	breed?: string | null;
	gender?: string | null;
	adoptionDate: string;
}

async function fetchGraduates(
	filters: { gender: string; animal_type: string; breed: string; },
	sortBy: string // Now expects 'adoption_date_desc' or 'adoption_date_asc' etc.
): Promise<Graduate[]> { // Expecting array of Graduate type
	const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

	// Define the statuses considered "Adopted" for this public page
	const adoptedStatuses = [
		'Adopted'
	];

	// Join the raw status strings with a comma
	const rawStatusQueryValue = adoptedStatuses.join(',');

	// Build the query parameters
	const queryParams = new URLSearchParams();

	// Append the RAW comma-separated string.
	queryParams.append('adoption_status', rawStatusQueryValue);

	// Add user-selectable filters
	function appendQueryParam(queryParams: URLSearchParams, key: string, value: string) {
		if (value) {
			queryParams.append(key, value);
		}
	}
	appendQueryParam(queryParams, 'gender', filters.gender);
	appendQueryParam(queryParams, 'animal_type', filters.animal_type);
	appendQueryParam(queryParams, 'breed', filters.breed);
	appendQueryParam(queryParams, 'sortBy', sortBy);

	const url = `${apiBaseUrl}/graduates?${queryParams.toString()}`;

	if (process.env.NODE_ENV !== 'production') {
		console.log("Fetching graduates from URL:", url);
	}

	try {
		const response = await fetch(url, {
			cache: 'no-store',
		});

		if (!response.ok) {
			// Log the response body for more details on error
			const errorBody = await response.text();
			console.error('API Error Response Body:', errorBody);
			throw new Error(`HTTP error! Status: ${response.status}`);
		}

		const data = await response.json();
		return data as Graduate[];
	} catch (error) {
		console.error('Error fetching graduates:', error);
		return [];
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


export default function GraduatesPage() {
	const [graduates, setGraduates] = useState<Graduate[]>([]); // Array of Animal objects
	const [loading, setLoading] = useState<boolean>(true); // Boolean for loading state
	const [error, setError] = useState<string | null>(null); // Error message or null
	const [genderFilter, setGenderFilter] = useState<string>(''); // String for gender filter
	const [animalTypes, setAnimalTypes] = useState<string[]>([]); // Array of animal types
	const [ageGroupFilter, setAgeGroupFilter] = useState('');
	const [animalTypeFilter, setAnimalTypeFilter] = useState('');
	const [breedFilter, setBreedFilter] = useState('');
	const [sortBy, setSortBy] = useState('adoption_date_desc'); // Default sort
	const sortingOptions = [
		{ value: 'adoption_date_desc', label: 'Adoption Date (Newest First)' },
		{ value: 'adoption_date_asc', label: 'Adoption Date (Oldest First)' },
		{ value: 'name_asc', label: 'Name (A-Z)' },
		{ value: 'name_desc', label: 'Name (Z-A)' },
	];

	// Fetch animal types
	useEffect(() => {
		async function loadTypes() {
			const types = await fetchAnimalTypes();
			setAnimalTypes(types);
		}
		loadTypes();
	}, []);

	useEffect(() => {
		const loadData = async () => {
			setLoading(true);
			setError(null);

			try {
				// Pass correct keys for filtering
				const fetchedGraduates = await fetchGraduates(
					{ gender: genderFilter, animal_type: animalTypeFilter, breed: breedFilter },
					sortBy
				);
				setGraduates(fetchedGraduates);
			} catch (err) {
				// Log the actual error for more details
				console.error("Error during data loading:", err);
				setError(err instanceof Error ? err.message : 'Failed to load animals');
			} finally {
				setLoading(false);
			}
		};

		loadData();
	}, [genderFilter, animalTypeFilter, breedFilter, sortBy]);

	const handleAnimalTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setAnimalTypeFilter(e.target.value);
	};

	const handleGenderFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setGenderFilter(e.target.value);
	};

	const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setSortBy(e.target.value);
	};

	// --- JSX (UI Code) ---
	// Add UI elements (like <input> or <select>) so user can actively filter by Breed or Age Group

	if (loading) {
		return (
			<div className="text-center py-10 text-gray-500 dark:text-gray-400">
				Loading graduates...
			</div>
		);
	}

	if (error) {
		return (
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					textAlign: "center",
				}}
			>
				Error: {error}
			</div>
		);
	}

	// --- Determine if any filters are currently active ---
	const filtersAreActive = genderFilter !== '' || animalTypeFilter !== '' || breedFilter !== '';

	return (
		<Container className="py-8 px-4">
			<GraduationCapIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
			<h1 className="text-3xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">Our Graduates</h1>
			<p className="text-center text-gray-600 dark:text-gray-400 mb-8">
				Celebrating the second chances found through adoption!
			</p>

			{/* Filtering Options */}
			<div className="flex flex-wrap items-center justify-center mb-6 gap-4">
				<select value={animalTypeFilter} onChange={handleAnimalTypeFilterChange} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600" aria-label="Filter by Animal Type">
					<option value="">All Species</option>
					{animalTypes.map(type => (
						<option key={type} value={type}>{type}</option>
					))}
				</select>
				<select value={genderFilter} onChange={handleGenderFilterChange} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600" aria-label="Filter by Animal Genders">
					<option value="">All Genders</option>
					<option value="Male">Male</option>
					<option value="Female">Female</option>
					{/* Add 'Unknown' or other genders if applicable */}
				</select>
				<select value={sortBy} onChange={handleSortChange} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
					{sortingOptions.map(option => (
						<option key={option.value} value={option.value}>{option.label}</option>
					))}
				</select>
			</div>

			{/* Graduate Grid */}
			{!loading && !error && (
				<> {/* Fragment to group results */}
					{graduates.length > 0 ? (
						// --- Display Grid ---
						<div className="flex justify-center">
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
								{graduates.map((graduate, index) => (
									<div
										key={graduate.id}
										className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transform transition duration-300 hover:scale-105 border border-gray-300 dark:border-transparent">
										<Link href={`/animal/${graduate.id}`} className="block"> {/* Make entire card clickable */}
											<div className="text-center">
												<h2 className="text-xl font-semibold py-2 text-gray-900 dark:text-gray-100 truncate px-2">
													{graduate.name}
												</h2>
											</div>
											<Image
												src={graduate.imageUrl || '/placeholder-image.png'}
												alt={graduate.name ? `${graduate.name}` : ''}
												width={400}
												height={300}
												className="w-full h-64 object-cover" // Ensure consistent image size
												priority={index < 4} // Prioritize loading images for first few graduates
											/>
											<div className="p-4 text-center min-h-[50px]">
												<p className="text-sm font-medium text-gray-500 dark:text-gray-400">
													Adopted: {graduate.adoptionDate ? format(new Date(graduate.adoptionDate), 'MMM dd, yyyy') : 'Date N/A'}
												</p>
											</div>
										</Link>
									</div>
								))}
							</div>
						</div>
					) : (
						// --- Display Correct "No Results" Message ---
						<div className="text-center py-16 px-4">
							<GraduationCapIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
								{filtersAreActive ? (
									// Message when filters are active but yield no results
									<>
										<h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No Graduates Match Your Filters</h3>
										<p className="text-gray-500 dark:text-gray-400">
											Try adjusting or resetting your filters to see more of our happy alumni!
										</p>
										<button
											onClick={() => {
												setGenderFilter('');
												setAnimalTypeFilter('');
												setBreedFilter(''); // Reset breed if UI exists
												// Optionally reset sort? setSortBy('adoption_date_desc');
											}}
											className="mt-4 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none"
										>
											Reset Filters
										</button>
									</>
								) : (
									// Message when NO filters are active and NO graduates exist overall
									<>
										<h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-3"> Our First Graduates Are Coming Soon! </h3>
										<p className="text-gray-600 dark:text-gray-400 mb-6 max-w-xl mx-auto">
											As a newer rescue, we&apos;re eagerly waiting to celebrate our first successful adoptions.
											</p>
											<div className="flex flex-col sm:flex-row justify-center gap-4">
												<Link href="/available-animals" className="...">See Available Animals</Link>
												<Link href="/get-involved#adopt" className="...">Learn About Adopting</Link>
											</div>
									</>
								)}
							</div>
					)}
				</>
			)}
		</Container>
	);
}
