'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // For refreshing data
import { getAuth0AccessToken } from '@/utils/auth';
import { LoadingSpinner, ExclamationTriangleIcon } from '@/components/Icons';

const applicationStatuses = ['Pending Review', 'Approved', 'Rejected', 'On Hold', 'Withdrawn']; // Keep consistent

interface UpdateApplicationData {
	newStatus: string;
	internalNotes?: string;
}

interface FosterApplicationReviewFormProps {
	applicationId: number;
	currentStatus: string;
	currentInternalNotes: string;
}

export default function FosterApplicationReviewForm({
	applicationId,
	currentStatus,
	currentInternalNotes, // Might not be needed if notes are appended
}: FosterApplicationReviewFormProps) {
	const router = useRouter();
	const [newStatus, setNewStatus] = useState(currentStatus);
	const [internalNotes, setInternalNotes] = useState(''); // New notes to add
	const [isUpdating, setIsUpdating] = useState(false);
	const [updateError, setUpdateError] = useState<string | null>(null);
	const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

	const handleStatusUpdate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newStatus) {
			setUpdateError("Please select a new status.");
			return;
		}

		setIsUpdating(true);
		setUpdateError(null);
        setUpdateSuccess(null);
		const token = await getAuth0AccessToken();
		if (!token) {
			setUpdateError("Authentication token missing.");
			setIsUpdating(false);
			return;
		}

		const payload: UpdateApplicationData = {
			newStatus: newStatus,
			internalNotes: internalNotes || undefined,
		};

		try {
			const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
			const response = await fetch(`${apiBaseUrl}/admin/foster-applications/${applicationId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
				body: JSON.stringify(payload),
			});
			const result = await response.json();
			if (!response.ok) {
				throw new Error(result.error?.message || result.message || "Failed to update application status.");
			}
			// Success
			setUpdateSuccess(`Application status updated to "${newStatus}". Notes added.`);
            setInternalNotes(''); // Clear notes field after successful update
            router.refresh(); // REFRESH the parent Server Component's data
			// The newStatus is now the currentStatus, so no need to reset select if it reflects applicationDetail.status
		} catch (err) {
			setUpdateError(err instanceof Error ? err.message : "Failed to update application.");
			console.error("Status update error:", err);
		} finally {
			setIsUpdating(false);
		}
	};

	return (
		<form onSubmit={handleStatusUpdate} className="space-y-4">
			<div>
				<label htmlFor="newStatus" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Update Status *</label>
				<select
					id="newStatus"
					value={newStatus}
					onChange={(e) => setNewStatus(e.target.value)}
					className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm focus:ring-gray-500 focus:border-gray-500"
				>
					{applicationStatuses.map(status => <option key={status} value={status}>{status}</option>)}
				</select>
			</div>
			<div>
				<label htmlFor="internalNotes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Add Internal Notes (will be appended)</label>
				<textarea
					id="internalNotes"
					rows={3}
					value={internalNotes}
					onChange={(e) => setInternalNotes(e.target.value)}
					className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm focus:ring-gray-500 focus:border-gray-500"
					placeholder="Add new notes about this status change or review..." />
			</div>
			{updateError && (
				<p className="p-2 text-sm text-red-700 bg-red-100 dark:text-red-200 dark:bg-red-900/30 border border-red-300 rounded-md">
					<ExclamationTriangleIcon className="h-4 w-4 inline mr-1 align-text-bottom" /> {updateError}
				</p>
			)}
			<div className="flex justify-end gap-3">
				<button type="submit" disabled={isUpdating || newStatus === currentStatus} className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary-700 disabled:opacity-50">
					{isUpdating ? <LoadingSpinner className="w-5 h-5" /> : "Save Status Update"}
				</button>
			</div>
		</form>
	);
}
