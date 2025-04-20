'use client';

import React, { useState, useEffect } from 'react';
import { Container } from '@/components/Container';
import Image from 'next/image';
import Link from 'next/link';
import { Animal } from '@/types/animal';
import { GraduationCapIcon } from "@/components/Icons";

// Define or import a type matching the actual API response (now snake_case)
// This could just be your existing Animal type if it uses snake_case
interface GraduateAnimal {
	id: number;
	name: string | null;
	image_url: string | null; // snake_case
	animal_type: string | null; // snake_case
	breed: string | null;
	gender: string | null;
	// adoptionDate is not included in this simplified version
}

// Fetch function targeting the new endpoint
async function fetchGraduates(filters: {
	gender: string;
	animal_type: string; // Use snake_case key matching backend expectation
	breed: string;
}, sortBy: string): Promise<Animal[]> { // Expecting Animal type from backend (snake_case)
	const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
	const endpoint = `${apiBaseUrl}/graduates`;

	const queryParams = new URLSearchParams();
	// Append using snake_case keys
	if (filters.gender) queryParams.append('gender', filters.gender);
	if (filters.animal_type) queryParams.append('animal_type', filters.animal_type);
	if (filters.breed) queryParams.append('breed', filters.breed);
	queryParams.append('sortBy', sortBy); // e.g., 'most_recent_update'

	const url = `${endpoint}?${queryParams.toString()}`;
	console.log("Fetching graduates from URL:", url);

	try {
		const response = await fetch(url, { cache: 'no-store' });
		if (!response.ok) {
			const errorBody = await response.text();
			console.error('API Error Response Body:', errorBody);
			throw new Error(`HTTP error! Status: ${response.status}`);
		}
		const data = await response.json();
		// API now returns snake_case, should match Animal type
		return data as Animal[];
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

// --- Main Page Component ---
export default function GraduatesPage() {
	const [graduates, setGraduates] = useState<Animal[]>([]); // Use Animal type
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [genderFilter, setGenderFilter] = useState<string>('');
	const [animalTypeFilter, setAnimalTypeFilter] = useState<string>('');
	const [breedFilter, setBreedFilter] = useState<string>('');
	const [animalTypes, setAnimalTypes] = useState<string[]>([]);

	// --- UPDATED Sorting state and options (matching backend) ---
	const [sortBy, setSortBy] = useState('most_recent_update'); // Default sort
	const sortingOptions = [
		{ value: 'most_recent_update', label: 'Most Recent Update' }, // Matched backend key
		{ value: 'least_recent_update', label: 'Least Recent Update' }, // Matched backend key
		{ value: 'name_asc', label: 'Name (A-Z)' }, // Matched backend key
		{ value: 'name_desc', label: 'Name (Z-A)' }, // Matched backend key
	];
	// --- ---

	// Fetch animal types
	useEffect(() => {
		async function loadTypes() {
			const types = await fetchAnimalTypes();
			setAnimalTypes(types);
		}
		loadTypes();
	}, []);

	// Fetch graduates
	useEffect(() => {
		const loadData = async () => {
			setLoading(true);
			setError(null);
			try {
				// Pass snake_case keys in the filter object
				const fetchedGraduates = await fetchGraduates(
					{ gender: genderFilter, animal_type: animalTypeFilter, breed: breedFilter },
					sortBy
				);
				setGraduates(fetchedGraduates);
			} catch (err) {
				console.error("Error loading graduates:", err);
				setError(err instanceof Error ? err.message : 'Failed to load graduates');
			} finally {
				setLoading(false);
			}
		};
		loadData();
	}, [genderFilter, animalTypeFilter, breedFilter, sortBy]); // Dependencies

	// --- Handlers ---
	const handleAnimalTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => setAnimalTypeFilter(e.target.value);
	const handleGenderFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => setGenderFilter(e.target.value);
	const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value);
	// --- ---

	// --- JSX Rendering ---
	return (
		<Container className="py-8 px-4">
			{graduates.length > 0 && (
				<>
					<GraduationCapIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
					<h1 className="text-3xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">Our Graduates</h1>
					<p className="text-center text-gray-600 dark:text-gray-400 mb-8">
						Celebrating the second chances found through adoption!
					</p>

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
				</>
			)}

			{/* Loading / Error States */}
			{loading && (
				<div className="text-center py-10 text-gray-500 dark:text-gray-400">Loading graduates...</div>
			)}
			{error && (
				<div className="text-center py-10 text-red-500 dark:text-red-400">Error: {error}</div>
			)}

			{/* Graduates Grid */}
			{!loading && !error && graduates.length > 0 && (
				<div className="flex justify-center">
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
						{graduates.map((graduate, index) => (
							<div
								key={graduate.id}
								className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
							>
								<div className="text-center">
									<h2 className="text-xl font-semibold py-2 text-gray-900 dark:text-gray-100 truncate px-2">
										{graduate.name}
									</h2>
								</div>
								<Image
									src={graduate.image_url || '/placeholder-image.png'}
									alt={graduate.name ? `Adopted: ${graduate.name}` : 'Adopted animal'}
									width={400}
									height={300}
									className="w-full h-64 object-cover"
									priority={index < 4}
								/>
								<div className="p-4 text-center min-h-[50px]">
									<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
										{graduate.breed} ({graduate.animal_type})
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* No Results State */}
			{!loading && !error && graduates.length === 0 && (
				<div className="col-span-full text-center py-16 px-4">
					<GraduationCapIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
					<h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-3">
						Our First Graduates Are Coming Soon!
					</h3>
					<p className="text-gray-600 dark:text-gray-400 mb-6 max-w-xl mx-auto">
						As a newer rescue, we&apos;re eagerly waiting to celebrate our first successful adoptions.
						You could be the one to give a deserving animal their second chance and become one of our
						first &apos;graduates&apos;!
					</p>
					<div className="flex flex-col sm:flex-row justify-center gap-4">
						<Link
							href="/available-animals"
							className="inline-block bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-5 rounded-md transition duration-300 text-base shadow-md"
						>
							See Available Animals
						</Link>
						<Link
							href="/get-involved#adopt"
							className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 font-bold py-2 px-5 rounded-md transition duration-300 text-base"
						>
							Learn About Adopting
						</Link>
					</div>
				</div>
			)}
		</Container>
	);
}
