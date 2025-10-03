import React, { useState } from 'react';
import { Animal } from '@/types/animal';
import { getAuth0AccessToken } from '@/utils/auth';

interface SendContractModalProps {
	animal: Animal;
	onClose: () => void;
	onSent: () => void;
}

const SendContractModal: React.FC<SendContractModalProps> = ({ animal, onClose, onSent }) => {
	const [recipientEmail, setRecipientEmail] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		try {
			const token = await getAuth0AccessToken();

			if (!token) {
				setError("Authentication failed. Please log in again.");
				return;
			}

			const payload = {
				recipientEmail,
				animalName: animal.name,
				animalSpecies: animal.species,
				animalBreed: animal.breed,
				animalGender: animal.gender,
				scarsId: Number(animal.id),
			};

			const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
			const response = await fetch(`${apiBaseUrl}/send-contract`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				throw new Error('Failed to send the contract. Please try again.');
			}

			onSent(); // Notify parent component that email was sent
			onClose(); // Close the modal

		} catch (err: any) {
			setError(err.message || 'An unexpected error occurred.');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
			<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
				<h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Send Adoption Contract for {animal.name}</h2>
				<form onSubmit={handleSubmit}>
					<div className="mb-4">
						<label htmlFor="recipientEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
							Adopter&apos;s Email Address
						</label>
						<input
							type="email"
							id="recipientEmail"
							value={recipientEmail}
							onChange={(e) => setRecipientEmail(e.target.value)}
							className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
							required
						/>
					</div>
					{error && <p className="text-red-500 text-sm mb-4">{error}</p>}
					<div className="flex justify-end gap-4">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
							disabled={isLoading}
						>
							Cancel
						</button>
						<button
							type="submit"
							className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent-dark disabled:bg-gray-400"
							disabled={isLoading}
						>
							{isLoading ? 'Sending...' : 'Send Contract'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default SendContractModal;
