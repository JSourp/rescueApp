'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Container } from '@/components/Container';
import Modal from '@/components/Modal';
import { LoadingSpinner } from '@/components/Icons';
import { UserGroupIcon } from '@heroicons/react/20/solid';
import { FosterApplicationListItem } from '@/types/fosterApplicationListItem';
import { FosterApplicationDetail } from '@/types/fosterApplicationDetail';
import { UserProfile } from '@/types/userProfile';
import { useUser } from '@auth0/nextjs-auth0/client';
import { getAuth0AccessToken } from '@/utils/auth';
import { format } from 'date-fns';


// Define the type for the filters object
interface FosterAppFilters {
	status: string;
}

// Define the type for data needed for the update DTO
interface UpdateApplicationData {
	newStatus: string;
	internalNotes?: string;
}

// Fetch function for applications
async function fetchFosterApplications(
	filters: FosterAppFilters,
	sortBy: string,
	accessToken: string
): Promise<FosterApplicationListItem[]> {
	const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
	if (!apiBaseUrl) {
		const errorMessage = "API Base URL is not configured. Please check environment variables.";
		console.error(errorMessage);
		throw new Error(errorMessage);
	}
	const endpoint = `${apiBaseUrl}/foster-applications`; // Ensure route matches backend
	const queryParams = new URLSearchParams();

	if (filters.status) queryParams.append('status', filters.status);
	if (sortBy) queryParams.append('sortBy', sortBy);

	const url = `${endpoint}?${queryParams.toString()}`;
	console.log("Fetching foster applications from URL:", url);

	try {
		const response = await fetch(url, {
			headers: { 'Authorization': `Bearer ${accessToken}` },
			cache: 'no-store'
		});

		console.log(`Response status from ${url}: ${response.status}`);

		if (!response.ok) {
			let errorBodyText = "Could not read error body.";
			try {
				errorBodyText = await response.text(); // Read as text first to see raw error
			} catch (e) {
				console.error("Failed to read error body as text", e);
			}
			console.error(`API Error Response Body from ${url}:`, errorBodyText);
			throw new Error(`API Error: ${response.status} - ${response.statusText}. Body: ${errorBodyText.substring(0, 100)}`);
		}

		const data = await response.json();
		console.log("Data received from API and parsed as JSON:", data);

		return data as FosterApplicationListItem[];
	} catch (error) {
		console.error('Error fetching foster applications:', error);
		throw error;
	}
}

// --- Fetch function for a single application's full details ---
async function fetchFosterApplicationDetail(
	applicationId: number,
	accessToken: string
): Promise<FosterApplicationDetail | null> {
	const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
	const endpoint = `${apiBaseUrl}/foster-applications/${applicationId}`;
	console.log("Fetching foster application detail from URL:", endpoint);

	try {
		const response = await fetch(endpoint, {
			headers: { 'Authorization': `Bearer ${accessToken}` },
			cache: 'no-store'
		});
		if (!response.ok) {
			const err = await response.json();
			throw new Error(err.error?.message || `API Error: ${response.status}`);
		}
		return await response.json() as FosterApplicationDetail;
	} catch (error) {
		console.error(`Error fetching detail for application ${applicationId}:`, error);
		throw error; // Re-throw to be caught by caller
	}
}

async function fetchCurrentUserProfile(accessToken: string | null): Promise<UserProfile | null> {
	if (!accessToken) return null;
	const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
	try {
		const response = await fetch(`${apiBaseUrl}/users/me`, {
			headers: { 'Authorization': `Bearer ${accessToken}` },
			cache: 'no-store'
		});
		if (!response.ok) {
			console.error(`API Error fetching user profile: ${response.status}`);
			return null;
		}
		return await response.json() as UserProfile;
	} catch (error) {
		console.error("Error fetching user profile:", error);
		return null;
	}
}

// Possible statuses for filtering and updating
const applicationStatuses = ['Pending Review', 'Approved', 'Rejected', 'On Hold', 'Withdrawn'];

export default function AdminFosterApplicationsPage() {
	const { user: auth0User, isLoading: isAuthLoading, error: authError } = useUser();
	const [applications, setApplications] = useState<FosterApplicationListItem[]>([]);
	const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
	const [errorData, setErrorData] = useState<string | null>(null);
	const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
	const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
	const [isLoadingRole, setIsLoadingRole] = useState<boolean>(true);

	const [statusFilter, setStatusFilter] = useState<string>('Pending Review'); // Default filter
	const [sortBy, setSortBy] = useState('submissionDate_desc');
	const sortingOptions = [
		{ value: 'submissionDate_desc', label: 'Submission Date (Newest)' },
		{ value: 'submissionDate_asc', label: 'Submission Date (Oldest)' },
		{ value: 'applicantName_asc', label: 'Applicant Name (A-Z)' },
		{ value: 'applicantName_desc', label: 'Applicant Name (Z-A)' },
		{ value: 'status_asc', label: 'Status (A-Z)' },
	];

	// --- State for Review Modal ---
	const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
	const [selectedApplicationSummary, setSelectedApplicationSummary] = useState<FosterApplicationListItem | null>(null);
	const [applicationDetail, setApplicationDetail] = useState<FosterApplicationDetail | null>(null);
	const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
	const [selectedApplication, setSelectedApplication] = useState<FosterApplicationListItem | null>(null);
	const [newStatus, setNewStatus] = useState<string>('');
	const [internalNotes, setInternalNotes] = useState<string>('');
	const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
	const [updateError, setUpdateError] = useState<string | null>(null);

	// Fetch User Role Effect
	useEffect(() => {
		const loadUserRole = async () => {
			// Don't fetch role until auth0 loading is done and user object exists
			if (isAuthLoading || !auth0User) {
				setIsLoadingRole(isAuthLoading); // Reflect auth loading status
				if (!isAuthLoading && !auth0User) setCurrentUserRole("Guest"); // Assume Guest if not logged in after load
				return;
			}
			setIsLoadingRole(true);
			const token = await getAuth0AccessToken();
			const profile = await fetchCurrentUserProfile(token);
			setCurrentUserRole(profile?.role ?? "Guest"); // Set role or default to Guest
			setCurrentUserProfile(profile);
			setIsLoadingRole(false);
		};
		loadUserRole();
	}, [auth0User, isAuthLoading]); // Rerun when auth state changes

	// Fetch Applications Data
	const loadApplications = useCallback(async () => {
		if (isAuthLoading || isLoadingRole || !currentUserProfile || !['Admin', 'Staff'].includes(currentUserProfile.role ?? '')) {
			if (!isAuthLoading && !isLoadingRole) setIsLoadingData(false); // Not authorized or still loading auth
			return;
		}
		setIsLoadingData(true); setErrorData(null);
		const token = await getAuth0AccessToken();
		if (!token) {
			setErrorData("Authentication token missing.");
			setIsLoadingData(false);
			return;
		}
		try {
			const filters = { status: statusFilter };
			const fetchedApps = await fetchFosterApplications(filters, sortBy, token);
			setApplications(fetchedApps);
		} catch (err) { setErrorData(err instanceof Error ? err.message : 'Failed to load applications'); }
		finally { setIsLoadingData(false); }
	}, [statusFilter, sortBy, isAuthLoading, isLoadingRole, currentUserProfile]);

	useEffect(() => { loadApplications(); }, [loadApplications]);

	// --- Handlers ---
	const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value);
	const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value);

	const handleReviewClick = async (appSummary: FosterApplicationListItem) => {
		setSelectedApplicationSummary(appSummary); // Store summary for modal title
		setApplicationDetail(null); // Clear previous details
		setIsLoadingDetail(true); // Show loading in modal
		setNewStatus(appSummary.status);
		setInternalNotes(''); // Or fetch existing notes if API provides them
		setUpdateError(null);
		setIsReviewModalOpen(true);

		const token = await getAuth0AccessToken();
		if (!token) {
			setUpdateError("Authentication token missing to fetch details.");
			setIsLoadingDetail(false);
			return;
		}
		try {
			const detail = await fetchFosterApplicationDetail(appSummary.id, token);
			setApplicationDetail(detail);
		} catch (err) {
			setUpdateError(err instanceof Error ? err.message : "Failed to load application details.");
		} finally {
			setIsLoadingDetail(false);
		}
	};

	const handleCloseReviewModal = () => {
		setIsReviewModalOpen(false);
		setSelectedApplication(null);
	};

	const handleStatusUpdate = async () => {
		if (!applicationDetail || !newStatus) return;

		setIsUpdatingStatus(true);
		setUpdateError(null);
		const token = await getAuth0AccessToken();
		if (!token) {
			setUpdateError("Authentication token missing.");
			setIsUpdatingStatus(false); return;
		}

		const payload: UpdateApplicationData = {
			newStatus: newStatus,
			internalNotes: internalNotes || undefined, // Send undefined if empty
		};

		try {
			const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
			const response = await fetch(`${apiBaseUrl}/foster-applications/${applicationDetail.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
				body: JSON.stringify(payload),
			});
			const result = await response.json();
			if (!response.ok) {
				throw new Error(result.error?.message || result.message || "Failed to update status.");
			}
			// Success
			loadApplications(); // Refresh the list
			handleCloseReviewModal();
		} catch (err) {
			setUpdateError(err instanceof Error ? err.message : "Failed to update application.");
			console.error("Status update error:", err);
		} finally {
			setIsUpdatingStatus(false);
		}
	};

	// Styling classes
	const thClasses = "px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800";
	const tdClasses = "px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700";

	// --- Render Logic ---
	if (isAuthLoading || isLoadingRole) return
	<Container className="text-center py-10">
		<div className="flex flex-col items-center">
			<LoadingSpinner className="mb-4" />
			<span>Loading Access...</span>
		</div>
	</Container>;
	if (!currentUserRole || !['Admin', 'Staff'].includes(currentUserRole ?? '')) {
		return <Container className="text-center py-10 text-red-500">Access Denied. You must be an Admin or Staff to view this page.</Container>;
	}

	return (
		<>
			<Container className="py-10">
				{/* Main Title - Centered */}
				<div className="text-center mb-4">
					<UserGroupIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
					<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
						Manage Foster Applications
					</h1>
				</div>

				{/* Filters and Sorting */}
				<div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow flex flex-wrap gap-4 items-end">
					<div>
						<label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter by Status</label>
						<select id="statusFilter" value={statusFilter} onChange={handleStatusFilterChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm">
							<option value="">All Statuses</option>
							{applicationStatuses.map(status => <option key={status} value={status}>{status}</option>)}
						</select>
					</div>
					<div>
						<label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort By</label>
						<select id="sortBy" value={sortBy} onChange={handleSortChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm">
							{sortingOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
						</select>
					</div>
				</div>

				{/* Loading / Error for Data */}
				{isLoadingData && <div className="text-center py-10"><LoadingSpinner /> Loading applications...</div>}
				{errorData && <div className="text-center py-10 text-red-500">Error: {errorData}</div>}

				{/* Applications Table */}
				{!isLoadingData && !errorData && (
					<div className="shadow border-b border-gray-200 dark:border-gray-700 sm:rounded-lg overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
							<thead>
								<tr>
									<th className={thClasses}>Applicant</th>
									<th className={thClasses}>Submitted</th>
									<th className={thClasses}>Status</th>
									<th className={thClasses}>Reviewed By</th>
									<th className={thClasses}>Actions</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
								{applications.length > 0 ? applications.map((app, index) => (
									<tr key={app.id} className={index % 2 === 0 ? "bg-white dark:bg-gray-800/50" : "bg-gray-50 dark:bg-gray-900/50"}>
										<td className={tdClasses}>
											<div>{app.applicantName}</div>
											<div className="text-xs text-gray-500 dark:text-gray-400">{app.primaryEmail}</div>
											<div className="text-xs text-gray-500 dark:text-gray-400">{app.primaryPhone}</div>
										</td>
										<td className={tdClasses}>{format(new Date(app.submissionDate), 'P p')}</td>
										<td className={tdClasses}>
											<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${app.status === 'Approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : app.status === 'Rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
												{app.status}
											</span>
										</td>
										<td className={tdClasses}>
											{app.reviewedBy || 'N/A'}
											{app.reviewDate && <div className="text-xs">({format(new Date(app.reviewDate), 'P')})</div>}
										</td>
										<td className={tdClasses}>
											<button onClick={() => handleReviewClick(app)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
												View/Review
											</button>
										</td>
									</tr>
								)) : (
									<tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">No applications match current filters.</td></tr>
								)}
							</tbody>
						</table>
					</div>
				)}
			</Container>

			{/* Review/Update Application Modal */}
			{isReviewModalOpen && selectedApplicationSummary && (
				<Modal onClose={handleCloseReviewModal} preventBackdropClickClose={true}>
					<div className="p-6">
						<h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
							Review Foster Application: {selectedApplicationSummary.applicantName}
						</h3>
						{isLoadingDetail && <div className="text-center py-4"><LoadingSpinner /> Loading details...</div>}
						{updateError && !isLoadingDetail && <p className="text-sm text-red-500 mb-3">Error loading details: {updateError}</p>}

						{!isLoadingDetail && applicationDetail && ( // Display details once loaded
							<div className="space-y-3 text-sm max-h-[60vh] overflow-y-auto pr-2 mb-4"> {/* Scrollable detail section */}
								<p><strong>Submission Date:</strong> {format(new Date(applicationDetail.submissionDate), 'PPP p')}</p>
								<p><strong>Email:</strong> {applicationDetail.primaryEmail}</p>
								<p><strong>Phone:</strong> {applicationDetail.primaryPhone} ({applicationDetail.primaryPhoneType})</p>

								{/* --- Display ALL fields from FosterApplicationDetailDto --- */}
								<h4 className="font-semibold mt-3 pt-2 border-t">Applicant Info</h4>
								<p>Name: {applicationDetail.firstName} ({applicationDetail.lastName})</p>
								<p>Spouse/Partner: {applicationDetail.spousePartnerRoommate || 'N/A'}</p>
								<p>Address: {applicationDetail.streetAddress}, {applicationDetail.aptUnit || ''} {applicationDetail.city}, {applicationDetail.stateProvince} {applicationDetail.zipPostalCode}</p>
								<p>Adults in Home: {applicationDetail.adultsInHome}</p>
								<p>Children in Home: {applicationDetail.childrenInHome || ''}</p>
								<p>Has allergies: {applicationDetail.hasAllergies || ''}</p>

								<h4 className="font-semibold mt-3 pt-2 border-t">Home Environment</h4>
								<p>Household aware of foster: {applicationDetail.householdAwareFoster}</p>
								<p>Dwelling: {applicationDetail.dwellingType}, {applicationDetail.rentOrOwn}</p>
								{applicationDetail.rentOrOwn === 'Rent' && <p>Landlord Permission: {applicationDetail.landlordPermission ? 'Yes' : 'No/Unstated'}</p>}
								<p>Yard: {applicationDetail.yardType || 'N/A'}</p>
								<p>Separation Plan: {applicationDetail.separationPlan}</p>

								<h4 className="font-semibold mt-3 pt-2 border-t">Current Pets</h4>
								<p>Has Pets: {applicationDetail.hasCurrentPets}</p>
								{applicationDetail.hasCurrentPets === 'Yes' && (
									<>
										<p>Details: {applicationDetail.currentPetsDetails}</p>
										<p>S/N: {applicationDetail.currentPetsSpayedNeutered}</p>
										<p>Vaccinations: {applicationDetail.currentPetsVaccinations}</p>
									</>
								)}
								<p>Vet: {applicationDetail.vetClinicName || 'N/A'} - {applicationDetail.vetPhone || 'N/A'}</p>

								<h4 className="font-semibold mt-3 pt-2 border-t">Foster Experience & Preferences</h4>
								<p>Fostered Before: {applicationDetail.hasFosteredBefore}</p>
								{applicationDetail.hasFosteredBefore === 'Yes' && <p>Prev. Details: {applicationDetail.previousFosterDetails}</p>}
								<p>Why Foster: {applicationDetail.whyFoster}</p>
								<p>Animal Types: {applicationDetail.fosterAnimalTypes}</p>
								<p>Medical Willing: {applicationDetail.willingMedical}</p>
								<p>Behavioral Willing: {applicationDetail.willingBehavioral}</p>
								<p>Commitment: {applicationDetail.commitmentLength}</p>
								<p>Transport: {applicationDetail.canTransport}</p>
								{applicationDetail.canTransport === 'Maybe' && <p>Transport Notes: {applicationDetail.transportExplanation}</p>}
								<p>Previous Pets: {applicationDetail.previousPetsDetails || 'N/A'}</p>
								<p>Heard via: {applicationDetail.howHeard || 'N/A'}</p>

								<h4 className="font-semibold mt-3 pt-2 border-t">Waver</h4>
								{applicationDetail.waiverAgreed && <p>Waver Signed By: {applicationDetail.eSignatureName}</p>}

								<h4 className="font-semibold mt-3 pt-2 border-t">Admin Review</h4>
								<p>Status: {applicationDetail.status}</p>
								<p>Reviewed By: {applicationDetail.reviewedByName || 'N/A'}</p>
								{applicationDetail.reviewDate && <p>Review Date: {format(new Date(applicationDetail.reviewDate), 'PPP p')}</p>}
								<p className="whitespace-pre-wrap">Internal Notes (All): <br />{applicationDetail.internalNotes || <span className="italic">None</span>}</p>
							</div>
						)}

						{/* Status Update Section (only if detail loaded) */}
						{!isLoadingDetail && applicationDetail && (
							<>
								<hr className="my-4 dark:border-gray-600" />
								<div className="mb-4">
									<label htmlFor="newStatus" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Update Status *</label>
									<select
										id="newStatus"
										value={newStatus}
										onChange={(e) => setNewStatus(e.target.value)}
										className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
									>
										{applicationStatuses.map(status => <option key={status} value={status}>{status}</option>)}
									</select>
								</div>
								<div className="mb-4">
									<label htmlFor="internalNotes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Internal Notes (Admin/Staff only)</label>
									<textarea
										id="internalNotes"
										rows={3}
										value={internalNotes}
										onChange={(e) => setInternalNotes(e.target.value)}
										className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm"
										placeholder="Add notes about the review or decision..."
									/>
								</div>
								{updateError && <p className="text-sm text-red-500 mb-3">Error during update: {updateError}</p>}
								<div className="flex justify-end gap-3">
									<button onClick={handleCloseReviewModal} disabled={isUpdatingStatus} className="px-4 py-2 text-sm rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500">Cancel</button>
									<button onClick={handleStatusUpdate} disabled={isUpdatingStatus || newStatus === selectedApplicationSummary.status} className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:bg-primary-700 disabled:opacity-50">
										{isUpdatingStatus ? <LoadingSpinner className="w-5 h-5" /> : "Save Update"}
									</button>
								</div>
							</>
						)}
					</div>
				</Modal>
			)}
		</>
	);
}
