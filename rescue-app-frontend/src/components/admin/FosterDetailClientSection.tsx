'use client';

import React, { useState } from 'react';
import { FosterDetailDto } from '@/types/fosterDetail';
import { FosteredAnimal } from '@/types/fosteredAnimal';
import Modal from '@/components/Modal';
import EditFosterProfileForm from './EditFosterProfileForm';
import AssignAnimalToFosterModal from './AssignAnimalToFosterModal';
import ReturnFromFosterModal from './ReturnFromFosterModal';
import { PencilSquareIcon, ArrowUturnLeftIcon } from '@/components/Icons';
import { PlusCircleIcon } from '@heroicons/react/20/solid';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

// Detail Item Helper (can be local or imported)
const DetailItem = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => {
	if (children === null || children === undefined || (typeof children === 'string' && children.trim() === '')) {
		children = <span className="italic text-gray-500 dark:text-gray-400">N/A</span>;
	}
	return (
		<div className={`py-2 sm:grid sm:grid-cols-3 sm:gap-4 ${className}`}>
			<dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
			<dd className={`mt-1 text-sm text-gray-900 dark:text-gray-100 sm:mt-0 sm:col-span-2`}>{children}</dd>
		</div>
	);
};

interface FosterDetailClientSectionProps {
	fosterData: FosterDetailDto;
}

export default function FosterDetailClientSection({ fosterData }: FosterDetailClientSectionProps) {
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [isAssignAnimalModalOpen, setIsAssignAnimalModalOpen] = useState(false);
	// State for returning an animal from foster
	const [isReturnAnimalModalOpen, setIsReturnAnimalModalOpen] = useState(false);
	const [animalToReturn, setAnimalToReturn] = useState<FosteredAnimal | null>(null);

	const router = useRouter();

	// Edit Profile Modal Handlers
	const handleOpenEditModal = () => setIsEditModalOpen(true);
	const handleCloseEditModal = () => setIsEditModalOpen(false);
	const handleProfileUpdated = () => {
		setIsEditModalOpen(false);
		router.refresh();
	};

	// Assign Animal Modal Handlers
	const handleOpenAssignAnimalModal = () => setIsAssignAnimalModalOpen(true);
	const handleCloseAssignAnimalModal = () => setIsAssignAnimalModalOpen(false);
	const handleAssignmentSuccess = () => {
		setIsAssignAnimalModalOpen(false);
		router.refresh();
	};

	// Return Animal From Foster Modal Handlers
	const handleOpenReturnAnimalModal = (animal: FosteredAnimal) => {
		setAnimalToReturn(animal);
		setIsReturnAnimalModalOpen(true);
	};
	const handleCloseReturnAnimalModal = () => {
		setIsReturnAnimalModalOpen(false);
		setAnimalToReturn(null);
	};
	const handleAnimalReturnedSuccess = () => {
		setIsReturnAnimalModalOpen(false);
		setAnimalToReturn(null);
		router.refresh();
	};


	return (
		<>
			{/* Action Buttons for the Foster Profile */}
			<div className="mb-6 text-right space-x-2">
				<button
					onClick={handleOpenEditModal}
					className="px-4 py-2 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600 inline-flex items-center gap-1">
					<PencilSquareIcon className="w-4 h-4" /> Edit Profile
				</button>
				<button
					onClick={handleOpenAssignAnimalModal}
					className="px-4 py-2 text-sm rounded-md bg-green-500 text-white hover:bg-green-600 inline-flex items-center gap-1">
					<PlusCircleIcon className="w-4 h-4" /> Assign Animal
				</button>
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-6">
				{/* Column 1: Contact & Profile Info */}
				<div className="lg:col-span-1 space-y-4">
					<div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-4">
						<h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-2">Contact & Profile</h3>
						<dl className="divide-y divide-gray-200 dark:divide-gray-700">
							<DetailItem label="Email">{fosterData.email}</DetailItem>
							<DetailItem label="Phone">{fosterData.primaryPhone}</DetailItem>
							<DetailItem label="Approved On">{format(new Date(fosterData.approvalDate), 'PPP')}</DetailItem>
							<DetailItem label="Availability Notes">{fosterData.availabilityNotes}</DetailItem>
							<DetailItem label="Capacity Details">{fosterData.capacityDetails}</DetailItem>
						</dl>
					</div>
					<div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-4">
						<h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-2">Foster Status & History</h3>
						<dl className="divide-y divide-gray-200 dark:divide-gray-700">
							<DetailItem label="Approved On">{format(new Date(fosterData.approvalDate), 'PPP')}</DetailItem>
							<DetailItem label="Home Visit Date">{fosterData.homeVisitDate ? format(new Date(fosterData.homeVisitDate), 'PPP') : 'N/A'}</DetailItem>
							<DetailItem label="Home Visit Notes">{fosterData.homeVisitNotes}</DetailItem>
							<DetailItem label="Profile Created">{format(new Date(fosterData.profileDateCreated), 'PPP p')}</DetailItem>
							<DetailItem label="Profile Updated">{format(new Date(fosterData.profileDateUpdated), 'PPP p')}</DetailItem>
							{fosterData.fosterApplicationId && (
								<DetailItem label="Original Application">
									<Link href={`/admin/foster-applications/review/${fosterData.fosterApplicationId}`} className="text-indigo-600 hover:underline">
										View Application (ID: {fosterData.fosterApplicationId})
									</Link>
								</DetailItem>
							)}
						</dl>
					</div>
				</div>

				{/* Column 2: Foster Preferences & Current Animals */}
				<div className="lg:col-span-2 space-y-6">
					<div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-4">
						<h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-2">Fostering Preferences</h3>
						<dl className="divide-y divide-gray-200 dark:divide-gray-700">
							<DetailItem label="Availability Notes">{fosterData.availabilityNotes}</DetailItem>
							<DetailItem label="Capacity Details">{fosterData.capacityDetails}</DetailItem>
						</dl>
					</div>

					{/* Animals Currently Fostering Section */}
					<div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-4">
						<div className="flex justify-between items-center mb-3">
							<h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
								Animals Currently in Care ({fosterData.currentlyFostering.length})
							</h3>
						</div>
						{fosterData.currentlyFostering.length > 0 ? (
							<ul className="divide-y divide-gray-200 dark:divide-gray-700">
								{fosterData.currentlyFostering.map(animal => (
									<li key={animal.id} className="py-3 flex items-center justify-between">
										<div>
											<Link href={`/admin/animal/${animal.id}`} className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
												{animal.name || `Animal ID ${animal.id}`}
											</Link>
											<p className="text-xs text-gray-500 dark:text-gray-400">
												{animal.animalType} - {animal.adoptionStatus}
											</p>
										</div>
										<button
											onClick={() => handleOpenReturnAnimalModal(animal)} // Handler is here
											className="text-xs text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300 hover:underline inline-flex items-center gap-1"
											title={`Mark ${animal.name || 'animal'} as returned from foster`}>
											<ArrowUturnLeftIcon className="w-3 h-3" /> Return from Foster
										</button>
									</li>
								))}
							</ul>
						) : (
							<p className="text-sm text-gray-500 dark:text-gray-400 italic">Not currently fostering any animals.</p>
						)}
					</div>
				</div>
			</div>

			{/* Modals */}
			{isEditModalOpen && (
				<Modal onClose={handleCloseEditModal} preventBackdropClickClose={true}>
					<EditFosterProfileForm
						fosterData={fosterData}
						onClose={handleCloseEditModal}
						onProfileUpdated={handleProfileUpdated}
					/>
				</Modal>
			)}

			{isAssignAnimalModalOpen && (
				<Modal onClose={handleCloseAssignAnimalModal} preventBackdropClickClose={true}>
					<AssignAnimalToFosterModal
						fosterId={fosterData.userId}
						fosterName={`${fosterData.firstName} ${fosterData.lastName}`}
						onClose={handleCloseAssignAnimalModal}
						onAssignmentSuccess={handleAssignmentSuccess}
					/>
				</Modal>
			)}

			{isReturnAnimalModalOpen && animalToReturn && (
				<Modal onClose={handleCloseReturnAnimalModal} preventBackdropClickClose={true}>
					<ReturnFromFosterModal
						animal={animalToReturn}
						fosterName={`${fosterData.firstName} ${fosterData.lastName}`}
						onClose={handleCloseReturnAnimalModal}
						onReturnSuccess={handleAnimalReturnedSuccess}
					/>
				</Modal>
			)}
		</>
	);
}
