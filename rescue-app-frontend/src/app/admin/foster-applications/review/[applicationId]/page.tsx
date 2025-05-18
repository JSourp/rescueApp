import React from 'react';
import { getSession } from '@auth0/nextjs-auth0';
import { redirect, useRouter } from 'next/navigation';
import { Container } from '@/components/Container';
import Link from 'next/link';
import { UserProfile } from '@/types/userProfile';
import { FosterApplicationDetail as FosterApplicationDetail } from '@/types/fosterApplicationDetail';
import { format } from 'date-fns';
import { PencilSquareIcon } from '@/components/Icons';
import { DocumentTextIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/20/solid';
import { fetchUserProfileServerSide } from '@/utils/serverAppUtils';
import FosterApplicationReviewForm from '@/components/admin/FosterApplicationReviewForm';

// --- Server-Side Fetch Function for Full Application Details ---
async function fetchSingleFosterApplication(applicationId: number, accessToken: string | undefined): Promise<FosterApplicationDetail | null> {
	const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
	if (!apiBaseUrl || !accessToken) {
		console.error("fetchSingleFosterApplication: Missing API base URL or access token.");
		return null;
	}
	const url = `${apiBaseUrl}/foster-applications/${applicationId}`;
	try {
		const response = await fetch(url, {
			headers: { 'Authorization': `Bearer ${accessToken}` },
			cache: 'no-store',
		});
		if (!response.ok) {
			const errorText = await response.text();
			console.error(`API Error fetching application ${applicationId}: ${response.status}`, errorText.substring(0, 200));
			return null;
		}
		return await response.json() as FosterApplicationDetail;
	} catch (error) {
		console.error(`Error in fetchSingleFosterApplication for ID ${applicationId}:`, error);
		return null;
	}
}

// Detail Item Helper
const DetailItem = ({ label, children, isFullWidth = false, isTextArea = false }: { label: string; children: React.ReactNode; isFullWidth?: boolean; isTextArea?: boolean }) => {
	if (children === null || children === undefined || (typeof children === 'string' && children.trim() === '')) {
		children = <span className="italic text-gray-500 dark:text-gray-400">N/A</span>;
	}
	return (
		<div className={`py-3 sm:py-4 ${isFullWidth ? 'sm:col-span-2' : 'sm:grid sm:grid-cols-3 sm:gap-4'}`}>
			<dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
			<dd className={`mt-1 text-sm text-gray-900 dark:text-gray-100 ${isFullWidth ? '' : 'sm:mt-0 sm:col-span-2'} ${isTextArea ? 'whitespace-pre-wrap' : ''}`}>
				{children}
			</dd>
		</div>
	);
};

export default async function AdminFosterApplicationReviewPage({ params }: { params: { applicationId: string } }) {
	const applicationId = parseInt(params.applicationId, 10);
	if (isNaN(applicationId)) {
		return <Container className="py-10 text-center text-red-500">Invalid Application ID.</Container>;
	}

	const session = await getSession();
	if (!session?.user || !session.accessToken) {
		redirect(`/admin-login?returnTo=/admin/foster-applications/review/${applicationId}`);
	}

	const userProfile = await fetchUserProfileServerSide(session.accessToken);
	if (!userProfile) { redirect('/'); }
	//if (!userProfile) { redirect(`/admin-login?error=profile_fetch_failed&returnTo=/admin/foster-applications/review/${applicationId}`); }

	const allowedRoles = ['Admin', 'Staff'];
	if (!userProfile.role || !allowedRoles.includes(userProfile.role)) {
		redirect('/');
		//redirect('/admin?error=unauthorized');
	}

	const application = await fetchSingleFosterApplication(applicationId, session.accessToken);

	if (!application) {
		return (
			<Container className="py-10 text-center">
				<h1 className="text-2xl font-bold text-red-600">Foster Application Not Found</h1>
				<p className="mt-4">Could not find details for application ID: {applicationId}</p>
				<Link href="/admin/fosters" className="mt-6 inline-block text-text-link hover:underline">Back to Manage Fosters</Link>
			</Container>
		);
	}

	const getStatusColor = (status: string) => {
		if (status === 'Approved') return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
		if (status === 'Rejected') return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
		if (status === 'On Hold') return 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100';
		return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'; // Pending Review
	};

	return (
		<Container className="py-10">
			<div className="mb-6">
				<Link href="/admin/fosters" className="text-sm text-text-link hover:underline dark:text-text-link">&larr; Back to Manage Fosters</Link>
			</div>

			<div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg">
				<div className="px-4 py-5 sm:px-6 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
						<div>
							<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
								<DocumentTextIcon className="w-8 h-8 text-text-link dark:text-text-link" />
								Foster Application Review
							</h1>
							<p className="text-sm text-gray-500 dark:text-gray-400">
								Applicant: {application.firstName} {application.lastName} (App ID: {application.id})
							</p>
						</div>
						<span className={`px-3 py-1 inline-block text-sm leading-5 font-semibold rounded-full ${getStatusColor(application.status)}`}>
							Status: {application.status}
						</span>
					</div>
				</div>

				{/* Application Details Section */}
				<div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-6">
					<dl className="sm:divide-y sm:divide-gray-200 dark:sm:divide-gray-700">
						<DetailItem label="Submission Date">{format(new Date(application.submissionDate), 'PPP p')}</DetailItem>

						{/* Applicant Info */}
						<div className="py-3"><h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 col-span-full">Applicant Information</h4></div>
						<DetailItem label="Name">{application.firstName} {application.lastName}</DetailItem>
						<DetailItem label="Spouse/Partner/Roommate">{application.spousePartnerRoommate}</DetailItem>
						<DetailItem label="Address">{`${application.streetAddress}, ${application.aptUnit || ''} ${application.city}, ${application.stateProvince} ${application.zipPostalCode}`}</DetailItem>
						<DetailItem label="Primary Email">{application.primaryEmail}</DetailItem>
						<DetailItem label="Primary Phone">{application.primaryPhone} ({application.primaryPhoneType})</DetailItem>
						{application.secondaryEmail && <DetailItem label="Secondary Email">{application.secondaryEmail}</DetailItem>}
						{application.secondaryPhone && <DetailItem label="Secondary Phone">{application.secondaryPhone} ({application.secondaryPhoneType})</DetailItem>}
						<DetailItem label="Heard Via">{application.howHeard}</DetailItem>

						{/* Household & Home Environment */}
						<div className="py-3"><h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 col-span-full">Home & Household</h4></div>
						<DetailItem label="Adults in Home">{application.adultsInHome}</DetailItem>
						<DetailItem label="Children in Home">{application.childrenInHome}</DetailItem>
						<DetailItem label="Allergies">{application.hasAllergies}</DetailItem>
						<DetailItem label="Household Aware & Supportive">{application.householdAwareFoster}</DetailItem>
						<DetailItem label="Dwelling Type">{application.dwellingType}</DetailItem>
						<DetailItem label="Rent or Own">{application.rentOrOwn}</DetailItem>
						{application.rentOrOwn === 'Rent' && <DetailItem label="Landlord Permission">{application.landlordPermission ? 'Yes' : 'No/Unstated'}</DetailItem>}
						<DetailItem label="Yard Type">{application.yardType}</DetailItem>
						<DetailItem label="Separation Plan" isTextArea>{application.separationPlan}</DetailItem>

						{/* Current Pet Information */}
						<div className="py-3"><h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 col-span-full">Current Pet Information</h4></div>
						<DetailItem label="Has Current Pets">{application.hasCurrentPets}</DetailItem>
						{application.hasCurrentPets === 'Yes' && (
							<>
								<DetailItem label="Current Pet Details" isTextArea>{application.currentPetsDetails}</DetailItem>
								<DetailItem label="Pets S/N">{application.currentPetsSpayedNeutered}</DetailItem>
								<DetailItem label="Pets Vaccinated">{application.currentPetsVaccinations}</DetailItem>
							</>
						)}
						<DetailItem label="Vet Clinic Name">{application.vetClinicName}</DetailItem>
						<DetailItem label="Vet Phone">{application.vetPhone}</DetailItem>
						<DetailItem label="Previous Pets Details" isTextArea>{application.previousPetsDetails}</DetailItem>


						{/* Foster Experience & Preferences */}
						<div className="py-3"><h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 col-span-full">Foster Experience & Preferences</h4></div>
						<DetailItem label="Fostered Before">{application.hasFosteredBefore}</DetailItem>
						{application.hasFosteredBefore === 'Yes' && <DetailItem label="Previous Foster Details" isTextArea>{application.previousFosterDetails}</DetailItem>}
						<DetailItem label="Reason for Fostering" isTextArea>{application.whyFoster}</DetailItem>
						<DetailItem label="Interested Animal Types" isTextArea>{application.fosterAnimalTypes}</DetailItem>
						<DetailItem label="Willing for Medical Needs">{application.willingMedical}</DetailItem>
						<DetailItem label="Willing for Behavioral Needs">{application.willingBehavioral}</DetailItem>
						<DetailItem label="Commitment Length">{application.commitmentLength}</DetailItem>
						<DetailItem label="Can Transport">{application.canTransport}</DetailItem>
						{application.canTransport === 'Maybe' && <DetailItem label="Transport Explanation" isTextArea>{application.transportExplanation}</DetailItem>}

						{/* Admin Review Section */}
						<div className="py-3"><h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 col-span-full">Admin Review</h4></div>
						<DetailItem label="Reviewed By">{application.reviewedByName}</DetailItem>
						<DetailItem label="Review Date">{application.reviewDate ? format(new Date(application.reviewDate), 'PPP p') : 'N/A'}</DetailItem>
						<DetailItem label="Internal Notes (All)" isTextArea>{application.internalNotes}</DetailItem>
					</dl>
				</div>

				{/* Client Component for Status Update Form */}
				<div className="px-4 py-5 sm:p-6 border-t border-gray-200 dark:border-gray-700">
					<FosterApplicationReviewForm
						applicationId={application.id}
						currentStatus={application.status}
						currentInternalNotes={application.internalNotes || ""}
					/>
				</div>
			</div>
		</Container>
	);
}
