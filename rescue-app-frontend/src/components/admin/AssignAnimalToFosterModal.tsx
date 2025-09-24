'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AnimalListItem } from '@/types/animalListItem'; // For listing animals
import { getAuth0AccessToken } from '@/utils/auth';
import { LoadingSpinner, ExclamationTriangleIcon } from '@/components/Icons';
import { CheckCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/20/solid';

interface AssignAnimalToFosterModalProps {
	fosterId: string; // GUID (User ID of the foster)
	fosterName: string;
	onClose: () => void;
	onAssignmentSuccess: () => void; // To trigger refresh on parent page
}

// Fetch function for "fosterable" animals
async function fetchFosterableAnimals(
	searchTerm: string,
	accessToken: string
): Promise<AnimalListItem[]> {
	const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
	const queryParams = new URLSearchParams();

	// Define statuses that are considered "fosterable"
	const fosterableStatuses = ['Not Yet Available', 'Available', 'Adoption Pending'];
	queryParams.append('adoption_status', fosterableStatuses.join(','));
	queryParams.append('isNotFostered', 'true');
	queryParams.append('sortBy', 'name_asc');

	if (searchTerm) {
		queryParams.append('name', searchTerm); // Assuming backend supports 'name' search
	}

	const url = `${apiBaseUrl}/animals?${queryParams.toString()}`;
	console.log("Fetching fosterable animals from:", url);

	try {
		const response = await fetch(url, {
			headers: { 'Authorization': `Bearer ${accessToken}` },
			cache: 'no-store'
		});
		if (!response.ok) {
			const errText = await response.text();
			console.error("API Error fetching fosterable animals:", errText);
			throw new Error(`API Error: ${response.status} - ${errText.substring(0, 100)}`);
		}
		const data = await response.json();
		return data as AnimalListItem[];
	} catch (error) {
		console.error("Error in fetchFosterableAnimals:", error);
		return []; // Return empty on error to prevent crashes
	}
}


export default function AssignAnimalToFosterModal({
	fosterId,
	fosterName,
	onClose,
	onAssignmentSuccess
}: AssignAnimalToFosterModalProps) {
	const [availableAnimals, setAvailableAnimals] = useState<AnimalListItem[]>([]);
	const [isLoadingAnimals, setIsLoadingAnimals] = useState(true);
	const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [isAssigning, setIsAssigning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const loadAvailableAnimals = useCallback(async () => {
		setIsLoadingAnimals(true);
		setError(null);
		setSuccessMessage(null); // Clear previous success
		const token = await getAuth0AccessToken();
		if (!token) {
			setError("Authentication failed. Please log in again.");
			setIsLoadingAnimals(false);
			return;
		}
		try {
			const animals = await fetchFosterableAnimals(searchTerm, token);
			setAvailableAnimals(animals);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load available animals.");
		} finally {
			setIsLoadingAnimals(false);
		}
	}, [searchTerm]);

	useEffect(() => {
		loadAvailableAnimals();
	}, [loadAvailableAnimals]);

	const handleAssignAnimal = async () => {
		if (!selectedAnimalId) {
			setError("Please select an animal to assign.");
			return;
		}
		setIsAssigning(true);
		setError(null);
		setSuccessMessage(null);
		const token = await getAuth0AccessToken();
		if (!token) {
			setError("Authentication failed. Please log in again.");
			setIsAssigning(false);
			return;
		}

		const payload = {
			adoptionStatus: "Available - In Foster",
			currentFosterUserId: fosterId
		};

		try {
			const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
			const response = await fetch(`${apiBaseUrl}/animals/${selectedAnimalId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				const result = await response.json().catch(() => ({ error: { message: "Failed to parse error response." } }));
				throw new Error(result.error?.message || result.message || `Failed to assign animal (${response.status})`);
			}
			const updatedAnimal = await response.json(); // Get the updated animal

			setSuccessMessage(`Successfully assigned ${updatedAnimal.name || 'animal'} (ID: ${selectedAnimalId}) to ${fosterName}.`);
			setSelectedAnimalId(null);      // Reset selection
			loadAvailableAnimals();         // Refresh list of available animals in modal
			onAssignmentSuccess();          // Refresh parent page data (foster detail)

			setTimeout(onClose, 2500); // Optionally close modal after a delay
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to assign animal.");
			console.error("Assign animal error:", err);
		} finally {
			setIsAssigning(false);
		}
	};

	return (
		<div className="p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-auto">
			<h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
				Assign Animal to: {fosterName}
			</h3>

			<div className="mb-4 relative">
				<label htmlFor="animalSearch" className="sr-only">Search Available Animals</label>
				<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
					<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
				</div>
				<input
					type="text"
					id="animalSearch"
					placeholder="Search animals by name..."
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					className="w-full p-2 pl-10 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm focus:ring-indigo-500 focus:border-indigo-500"
				/>
			</div>

			{isLoadingAnimals && <div className="text-center py-4"><LoadingSpinner /> Loading available animals...</div>}
			{error && !isLoadingAnimals && <p className="text-sm text-red-500 mb-3 p-2 bg-red-100 dark:bg-red-900/30 rounded"><ExclamationTriangleIcon className="inline w-4 h-4 mr-1" /> {error}</p>}
			{successMessage && <p className="text-sm text-green-600 mb-3 p-2 bg-green-100 dark:bg-green-900/30 rounded"><CheckCircleIcon className="inline w-4 h-4 mr-1" /> {successMessage}</p>}

			{!isLoadingAnimals && !error && availableAnimals.length === 0 && (
				<p className="text-sm text-center py-4 text-gray-500 dark:text-gray-400 italic">No animals currently available for fostering or matching your search.</p>
			)}

			{!isLoadingAnimals && !error && availableAnimals.length > 0 && (
				<div className="max-h-60 overflow-y-auto border rounded dark:border-gray-700 mb-4">
					<ul className="divide-y divide-gray-200 dark:divide-gray-600">
						{availableAnimals.map(animal => (
							<li key={animal.id} className={`p-3 hover:bg-gray-100 dark:hover:bg-gray-700/50 ${selectedAnimalId === animal.id ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}>
								<label htmlFor={`animal-${animal.id}`} className="flex items-center cursor-pointer w-full">
									<input
										type="radio"
										id={`animal-${animal.id}`}
										name="selectedAnimal"
										value={animal.id}
										checked={selectedAnimalId === animal.id}
										onChange={() => setSelectedAnimalId(animal.id)}
										className="form-radio h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-500 focus:ring-indigo-500"
									/>
									<span className="ml-3 text-sm text-gray-800 dark:text-gray-200">
										{animal.name} ({animal.animalType} - {animal.breed}) - Status: {animal.adoptionStatus}
									</span>
								</label>
							</li>
						))}
					</ul>
				</div>
			)}

			<div className="flex justify-end gap-3 mt-6">
				<button type="button" onClick={onClose} disabled={isAssigning} className="px-4 py-2 text-sm rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500">Cancel</button>
				<button
					type="button"
					onClick={handleAssignAnimal}
					disabled={isAssigning || !selectedAnimalId || isLoadingAnimals}
					className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary-700 disabled:opacity-50"
				>
					{isAssigning ? <LoadingSpinner className="w-5 h-5 inline-flex items-center" /> : "Assign to Foster"}
				</button>
			</div>
		</div>
	);
}
