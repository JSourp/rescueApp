'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FosterListItem } from '@/types/fosterListItem';
import { getAuth0AccessToken } from '@/utils/auth';
import { LoadingSpinner, ExclamationTriangleIcon } from '@/components/Icons';
import { CheckCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/20/solid';

interface SelectFosterForAnimalModalProps {
	animalId: number;
	animalName: string | null;
	onClose: () => void;
	onPlacementSuccess: () => void;
}

// Fetch function for ACTIVE fosters
async function fetchActiveFosters(accessToken: string): Promise<FosterListItem[]> {
	const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
	const queryParams = new URLSearchParams();
	queryParams.append('isActiveFoster', 'true');
	queryParams.append('sortBy', 'lastname_asc');

	const url = `${apiBaseUrl}/fosters?${queryParams.toString()}`;
	console.log("Fetching active fosters from:", url);

	try {
		const response = await fetch(url, {
			headers: { 'Authorization': `Bearer ${accessToken}` },
			cache: 'no-store'
		});
		if (!response.ok) {
			const errText = await response.text();
			console.error("API Error fetching active fosters:", errText);
			throw new Error(`API Error: ${response.status} - ${errText.substring(0, 100)}`);
		}
		return await response.json() as FosterListItem[];
	} catch (error) {
		console.error("Error in fetchActiveFosters:", error);
		return [];
	}
}

export default function SelectFosterForAnimalModal({
	animalId,
	animalName,
	onClose,
	onPlacementSuccess
}: SelectFosterForAnimalModalProps) {
	const [activeFosters, setActiveFosters] = useState<FosterListItem[]>([]);
	const [isLoadingFosters, setIsLoadingFosters] = useState(true);
	const [selectedFosterUserId, setSelectedFosterUserId] = useState<string | null>(null); // GUID
	const [isPlacing, setIsPlacing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const loadActiveFosters = useCallback(async () => {
		setIsLoadingFosters(true);
		setError(null);
		const token = await getAuth0AccessToken();
		if (!token) {
			setError("Authentication failed. Please log in again.");
			setIsLoadingFosters(false);
			return;
		}
		try {
			const fosters = await fetchActiveFosters(token);
			setActiveFosters(fosters);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load available fosters.");
		} finally {
			setIsLoadingFosters(false);
		}
	}, []);

	useEffect(() => {
		loadActiveFosters();
	}, [loadActiveFosters]);

	const handlePlaceAnimal = async () => {
		if (!selectedFosterUserId) {
			setError("Please select a foster.");
			return;
		}
		setIsPlacing(true); setError(null); setSuccessMessage(null);
		const token = await getAuth0AccessToken();
		if (!token) { /* ... */ }

		const payload = {
			adoptionStatus: "Available - In Foster",
			currentFosterUserId: selectedFosterUserId
		};

		try {
			const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
			const response = await fetch(`${apiBaseUrl}/animals/${animalId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
				body: JSON.stringify(payload)
			});
			if (!response.ok) { throw new Error(`API Error: ${response.status}`); }
			const updatedAnimal = await response.json();
			setSuccessMessage(`Successfully placed ${animalName || 'animal'} with selected foster.`);
			setSelectedFosterUserId(null);
			onPlacementSuccess();
			setTimeout(onClose, 2000);
		} catch (error) {
			console.error(`Error fetching animal details for ID ${animalId}:`, error);
			return null;
		}
		finally { setIsPlacing(false); }
	};

	return (
		<div className="p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-auto">
			<h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
				Place {animalName || 'Animal'} with Foster
			</h3>

			{isLoadingFosters && <div className="text-center py-4"><LoadingSpinner /> Loading fosters...</div>}
			{error && !isLoadingFosters && (
				<p className="text-sm text-red-500 mb-3 p-2 bg-red-100 dark:bg-red-900/30 rounded-md border border-red-300 dark:border-red-700">
					<ExclamationTriangleIcon className="inline w-4 h-4 mr-1 align-text-bottom" /> {error}
				</p>
			)}
			{successMessage && (
				<p className="text-sm text-green-600 mb-3 p-2 bg-green-100 dark:bg-green-900/30 rounded-md border border-green-300 dark:border-green-700">
					<CheckCircleIcon className="inline w-4 h-4 mr-1 align-text-bottom" /> {successMessage}
				</p>
			)}

			{!isLoadingFosters && !error && !successMessage && ( // Don't show dropdown if success message is visible
				activeFosters.length > 0 ? (
					<div className="mb-4">
						<label htmlFor="fosterSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							Select an Active Foster:
						</label>
						<select
							id="fosterSelect"
							value={selectedFosterUserId || ''}
							onChange={(e) => setSelectedFosterUserId(e.target.value)}
							className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm focus:ring-indigo-500 focus:border-indigo-500"
							disabled={isPlacing}>
							<option value="" disabled>-- Select a Foster --</option>
							{activeFosters.map(foster => (
								<option key={foster.userId} value={foster.userId}>
									{foster.lastName}, {foster.firstName} ({foster.email})
								</option>
							))}
						</select>
					</div>
				) : (
					<p className="text-sm text-center py-4 text-gray-500 dark:text-gray-400 italic">
						No active fosters currently available in the system.
					</p>
				)
			)}

			{!successMessage && ( // Don't show action buttons if success message is visible
				<div className="flex justify-end gap-3 mt-8 pt-4 border-t dark:border-gray-700">
					<button type="button" onClick={onClose} disabled={isPlacing} className="px-4 py-2 text-sm rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500">Cancel</button>
					<button
						type="button"
						onClick={handlePlaceAnimal}
						disabled={isPlacing || !selectedFosterUserId || isLoadingFosters}
						className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary-700 disabled:opacity-50">
						{isPlacing ? <LoadingSpinner className="w-5 h-5" /> : "Confirm Placement"}
					</button>
				</div>
			)}
			{successMessage && ( // Show only close button after success
				<div className="flex justify-end mt-4 pt-4 border-t dark:border-gray-700">
					<button type="button" onClick={onClose}
						className="px-4 py-2 text-sm rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500">
						Close
					</button>
				</div>
			)}
		</div>
	);
}
