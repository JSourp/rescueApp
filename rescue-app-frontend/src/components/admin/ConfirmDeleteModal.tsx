// src/components/admin/ConfirmDeleteModal.tsx
'use client';

import React from 'react';
import { LoadingSpinner, TrashIcon, ExclamationTriangleIcon } from '@/components/Icons'; // Import icons

interface ConfirmDeleteModalProps {
	itemType: string; // e.g., 'animal', 'document'
	itemName: string;
	onClose: () => void;
	onConfirmDelete: () => void; // No need to pass ID again, parent handler knows
	isDeleting: boolean;
	errorMessage?: string | null;
}

export default function ConfirmDeleteModal({
	itemType,
	itemName,
	onClose,
	onConfirmDelete,
	isDeleting,
	errorMessage
}: ConfirmDeleteModalProps) {

	return (
		<div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md mx-auto">
			<div className="sm:flex sm:items-start">
				<div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 sm:mx-0 sm:h-10 sm:w-10">
					<ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
				</div>
				<div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
					<h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100" id="modal-title">
						Delete {itemName}?
					</h3>
					<div className="mt-2">
						<p className="text-sm text-gray-500 dark:text-gray-400">
							Are you sure you want to delete this {itemType}?
						</p>
						<p className="text-sm text-gray-500 dark:text-gray-400">
							This action cannot be undone.
						</p>
					</div>
				</div>
			</div>
			<div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
				<button
					type="button"
					disabled={isDeleting}
					className="inline-flex justify-center w-full border border-transparent text-text-on-accent bg-accent-700 hover:bg-accent-900 transition duration-300 rounded-md shadow px-4 py-2 font-medium sm:w-auto sm:text-sm disabled:opacity-50 dark:focus:ring-offset-gray-800"
					onClick={onConfirmDelete}
				>
					{isDeleting ? (
						<> <LoadingSpinner className="w-5 h-5 mr-2" /> Deleting... </>
					) : (
						'Yes, Delete'
					)}
				</button>
				<button
					type="button"
					disabled={isDeleting}
					className="mt-3 inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:w-auto sm:text-sm dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600 dark:focus:ring-offset-gray-800 disabled:opacity-50"
					onClick={onClose}
				>
					Cancel
				</button>
			</div>
		</div>
	);
}
