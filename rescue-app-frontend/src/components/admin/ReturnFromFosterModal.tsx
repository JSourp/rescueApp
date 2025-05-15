'use client';

import React, { useState } from 'react';
import { FosteredAnimal } from '@/types/fosteredAnimal';
import { getAuth0AccessToken } from '@/utils/auth';
import { LoadingSpinner, ExclamationTriangleIcon, SuccessCheckmarkIcon, ArrowUturnLeftIcon } from '@/components/Icons';
import { adoptionStatuses } from '@/constants/adoptionStatuses';

interface ReturnFromFosterModalProps {
	animal: FosteredAnimal;
	fosterName: string;
	onClose: () => void;
	onReturnSuccess: () => void;
}

export default function ReturnFromFosterModal({
	animal,
	fosterName,
	onClose,
	onReturnSuccess,
}: ReturnFromFosterModalProps) {
	const [newAdoptionStatus, setNewAdoptionStatus] = useState<string>('Available'); // Default
	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const handleConfirmReturn = async () => {
		if (!newAdoptionStatus) {
			setError("Please select a new status for the animal.");
			return;
		}

		setIsProcessing(true);
		setError(null);
		setSuccessMessage(null);
		const token = await getAuth0AccessToken();

		if (!token) {
			setError("Authentication failed. Please log in again.");
			setIsProcessing(false);
			return;
		}

		const payload = {
			// Send camelCase to match backend DTO UpdateAnimalRequest
			adoptionStatus: newAdoptionStatus,
			currentFosterUserId: null // Explicitly set to null
		};

		try {
			const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
			const response = await fetch(`${apiBaseUrl}/animals/${animal.id}`, { // PUT to animal's ID
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				const result = await response.json().catch(() => ({ error: { message: "Failed to parse error response." } }));
				throw new Error(result.error?.message || result.message || `Failed to return animal from foster (${response.status})`);
			}
			const updatedAnimal = await response.json();

			setSuccessMessage(`${animal.name || 'Animal'} successfully returned from foster with ${fosterName}. New status: ${newAdoptionStatus}.`);
			onReturnSuccess(); // This will refresh the foster detail page list

			setTimeout(() => {
				onClose(); // Close modal after success
			}, 2500);

		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to return animal from foster.");
			console.error("Return from foster error:", err);
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-auto">
			<div className="flex items-start mb-4">
				<div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 sm:mx-0 sm:h-10 sm:w-10">
					<ArrowUturnLeftIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
				</div>
				<div className="ml-3 mt-0 text-left">
					<h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
						Return {animal.name || 'Animal'} from Foster?
					</h3>
					<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
						Confirm return from foster care with {fosterName}. Please select the animal&apos;s new status.
					</p>
				</div>
			</div>

			{successMessage && (
				<p className="text-sm text-green-600 mb-3 p-2 bg-green-100 dark:bg-green-900/30 rounded">
					<SuccessCheckmarkIcon className="inline w-4 h-4 mr-1" /> {successMessage}
				</p>
			)}
			{error && (
				<p className="text-sm text-red-500 mb-3 p-2 bg-red-100 dark:bg-red-900/30 rounded">
					<ExclamationTriangleIcon className="inline w-4 h-4 mr-1" /> {error}
				</p>
			)}

			{!successMessage && ( // Only show form if no success message
				<div className="space-y-4">
					<div>
						<label htmlFor="newAnimalStatus" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							New Status for {animal.name || 'Animal'} after return: *
						</label>
						<select
							id="newAnimalStatus"
							value={newAdoptionStatus}
							onChange={(e) => setNewAdoptionStatus(e.target.value)}
							className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm focus:ring-indigo-500 focus:border-indigo-500"
							disabled={isProcessing}
						>
							<option value="">Select New Status...</option>
							{adoptionStatuses.map(status => (
								<option key={status} value={status}>{status}</option>
							))}
						</select>
					</div>
				</div>
			)}

			{!successMessage && (
				<div className="flex justify-end gap-3 mt-6">
					<button type="button" onClick={onClose} disabled={isProcessing} className="px-4 py-2 text-sm rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500">Cancel</button>
					<button
						type="button"
						onClick={handleConfirmReturn}
						disabled={isProcessing || !newAdoptionStatus}
						className="px-4 py-2 text-sm rounded-md bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50"
					>
						{isProcessing ? <LoadingSpinner className="w-5 h-5" /> : "Confirm Return"}
					</button>
				</div>
			)}
			{successMessage && (
				<div className="flex justify-end mt-4">
					<button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500">Close</button>
				</div>
			)}
		</div>
	);
}
