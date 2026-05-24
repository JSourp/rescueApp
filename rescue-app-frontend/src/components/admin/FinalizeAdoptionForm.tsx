'use client';

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { LoadingSpinner, SuccessCheckmarkIcon } from '@/components/Icons';
import { getAuth0AccessToken } from '@/utils/auth';
import { Animal } from '@/types/animal';
import { format } from 'date-fns';
import { FinalizeAdoptionFormDetail } from '@/types/finalizeAdoptionFormDetail';

interface FinalizeAdoptionFormProps {
	animal: Animal;
	onClose: () => void;
	onAdoptionComplete: () => void;
}

export default function FinalizeAdoptionForm({ animal, onClose, onAdoptionComplete }: FinalizeAdoptionFormProps) {
	const [applications, setApplications] = useState<any[]>([]);
	const [isProcessing, setIsProcessing] = useState<boolean>(false);
	const [apiError, setApiError] = useState<string | null>(null);

	const { register, handleSubmit, formState: { errors } } = useForm<FinalizeAdoptionFormDetail>({
		defaultValues: {
			adoptionApplicationId: undefined,
			adoptionDate: format(new Date(), 'yyyy-MM-dd'),
			notes: '',
		},
	});

	useEffect(() => {
		const fetchApps = async () => {
			const token = await getAuth0AccessToken();
			const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/adoption-applications`, {
				headers: { 'Authorization': `Bearer ${token}` }
			});
			if (res.ok) setApplications(await res.json());
		};
		fetchApps();
	}, []);

	const handleFinalize: SubmitHandler<FinalizeAdoptionFormDetail> = async (formData) => {
		setIsProcessing(true);
		setApiError(null);

		const payload = {
			animalId: animal.id,
			adoptionApplicationId: Number(formData.adoptionApplicationId),
			adoptionDate: formData.adoptionDate ? new Date(formData.adoptionDate).toISOString() : new Date().toISOString(),
			notes: formData.notes || null
		};

		try {
			const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/adoptions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${await getAuth0AccessToken()}`
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) throw new Error("Failed to finalize adoption");

			onAdoptionComplete();
			onClose();
		} catch (err: any) {
			setApiError(err.message);
		} finally {
			setIsProcessing(false);
		}
	};

	// UI Styles
	const inputBaseClasses = "w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100";
	const labelBaseClasses = "block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300";

	return (
		<form onSubmit={handleSubmit(handleFinalize)} className="p-6">
			<h3 className="text-xl font-semibold mb-4">Finalize Adoption for {animal.name}</h3>

			<div className="mb-4">
				<label className={labelBaseClasses}>Select Applicant *</label>
				<select {...register("adoptionApplicationId", { required: "Required" })} className={inputBaseClasses}>
					<option value="">-- Choose an application --</option>
					{applications.map(app => {
						const displayName = `${app.applicantName || ''}`;
						const displayEmail = app.primaryEmail || 'No Email';
						return (
							<option key={app.id} value={app.id}>
								{displayName} ({displayEmail})
							</option>
						);
					})}
				</select>
				{errors.adoptionApplicationId && <p className="text-red-500 text-xs mt-1">Required</p>}
			</div>

			<div className="mb-4">
				<label className={labelBaseClasses}>Adoption Date *</label>
				<input type="date" {...register("adoptionDate", { required: true })} className={inputBaseClasses} />
			</div>

			<div className="mb-4">
				<label className={labelBaseClasses}>Notes (Optional)</label>
				<textarea {...register("notes")} className={inputBaseClasses} rows={3} />
			</div>

			{apiError && <p className="text-red-500 mb-4">{apiError}</p>}

			<button
				type="submit"
				disabled={isProcessing}
				className="w-full bg-primary text-white py-2 rounded font-medium hover:bg-primary-600 disabled:opacity-50"
			>
				{isProcessing ? <LoadingSpinner /> : "Confirm Adoption"}
			</button>
		</form>
	);
}
