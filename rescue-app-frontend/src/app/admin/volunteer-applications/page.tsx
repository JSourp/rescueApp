'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Container } from '@/components/Container';
import Modal from '@/components/Modal';
import { LoadingSpinner } from '@/components/Icons';
import { UserGroupIcon, DocumentTextIcon } from '@heroicons/react/20/solid';
import { VolunteerApplicationListItem } from '@/types/volunteerApplicationListItem';
import { UserProfile } from '@/types/userProfile';
import { useUser } from '@auth0/nextjs-auth0/client';
import { getAuth0AccessToken } from '@/utils/auth';
import { format } from 'date-fns';

// Define the type for the filters object
interface VolunteerAppFilters {
	status: string;
}

// Possible statuses for filtering (should match backend/database options)
const applicationStatuses = ['Pending Review', 'Approved', 'Contacted', 'On Hold', 'Rejected', 'Withdrawn', 'Archived'];

// Fetch function for volunteer applications
async function fetchVolunteerApplications(
	filters: VolunteerAppFilters,
	sortBy: string,
	accessToken: string
): Promise<VolunteerApplicationListItem[]> {
	const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
	const endpoint = `${apiBaseUrl}/volunteer-applications`;
	const queryParams = new URLSearchParams();

	if (filters.status) queryParams.append('status', filters.status);
	if (sortBy) queryParams.append('sortBy', sortBy);

	const url = `${endpoint}?${queryParams.toString()}`;
	console.log("Fetching volunteer applications from URL:", url);

	try {
		const response = await fetch(url, {
			headers: { 'Authorization': `Bearer ${accessToken}` },
			cache: 'no-store' // Ensure fresh data
		});
		if (!response.ok) {
			const err = await response.json().catch(() => ({ error: { message: `API Error: ${response.status}` } }));
			throw new Error(err.error?.message || `API Error: ${response.status}`);
		}
		const data = await response.json();
		console.log("Data received from /volunteer-applications:", data);
		return data as VolunteerApplicationListItem[];
	} catch (error) {
		console.error('Error fetching volunteer applications:', error);
		throw error; // Re-throw to be caught by calling function
	}
}

// Helper to fetch current user's profile (you might have this in a shared utils file)
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


export default function AdminVolunteerApplicationsPage() {
	const { user: auth0User, isLoading: isAuthLoading, error: authError } = useUser();
	const [applications, setApplications] = useState<VolunteerApplicationListItem[]>([]);
	const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
	const [errorData, setErrorData] = useState<string | null>(null);
	const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
	const [isLoadingRole, setIsLoadingRole] = useState<boolean>(true);

	const [statusFilter, setStatusFilter] = useState<string>('Pending Review'); // Default filter
	const [sortBy, setSortBy] = useState('submissionDate_desc'); // Default sort
	const sortingOptions = [
		{ value: 'submissionDate_desc', label: 'Submission Date (Newest)' },
		{ value: 'submissionDate_asc', label: 'Submission Date (Oldest)' },
		{ value: 'applicantName_asc', label: 'Applicant Name (A-Z)' },
		{ value: 'applicantName_desc', label: 'Applicant Name (Z-A)' },
		{ value: 'status_asc', label: 'Status (A-Z)' }, // Assuming backend supports this
	];

	// State for a potential review modal (for future enhancement)
	// const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
	// const [selectedApplication, setSelectedApplication] = useState<VolunteerApplicationListItem | null>(null);

	// Fetch User Role Effect
	useEffect(() => {
		const loadUserRole = async () => {
			if (isAuthLoading || !auth0User) {
				setIsLoadingRole(isAuthLoading);
				if (!isAuthLoading && !auth0User) setCurrentUserRole("Guest");
				return;
			}
			setIsLoadingRole(true);
			const token = await getAuth0AccessToken();
			const profile = await fetchCurrentUserProfile(token);
			setCurrentUserRole(profile?.role ?? "Guest");
			setIsLoadingRole(false);
		};
		loadUserRole();
	}, [auth0User, isAuthLoading]);

	// Fetch Applications Data
	const loadApplications = useCallback(async () => {
		if (isAuthLoading || isLoadingRole || !currentUserRole || !['Admin', 'Staff'].includes(currentUserRole ?? '')) {
			if (!isAuthLoading && !isLoadingRole) setIsLoadingData(false);
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
			const fetchedApps = await fetchVolunteerApplications(filters, sortBy, token);
			setApplications(fetchedApps);
		} catch (err) { setErrorData(err instanceof Error ? err.message : 'Failed to load volunteer applications'); }
		finally { setIsLoadingData(false); }
	}, [statusFilter, sortBy, isAuthLoading, isLoadingRole, currentUserRole]);

	useEffect(() => { loadApplications(); }, [loadApplications]);

	// --- Handlers ---
	const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value);
	const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value);

	// const handleReviewClick = (app: VolunteerApplicationListItem) => {
	//     setSelectedApplication(app);
	//     setIsReviewModalOpen(true);
	// };
	// const handleCloseReviewModal = () => setIsReviewModalOpen(false);
	// const handleApplicationUpdated = () => {
	//     handleCloseReviewModal();
	//     loadApplications(); // Refresh list
	// };


	// Styling classes
	const thClasses = "px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800";
	const tdClasses = "px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700";

	if (isAuthLoading || isLoadingRole) return
	<Container className="text-center py-10">
		<div className="flex flex-col items-center">
			<LoadingSpinner className="mb-4" />
			<span>Loading Access...</span>
		</div>
	</Container>;
	if (!currentUserRole || !['Admin', 'Staff'].includes(currentUserRole)) {
		return <Container className="text-center py-10 text-red-500">Access Denied. You must be an Admin or Staff to view this page.</Container>;
	}

	return (
		<>
			<Container className="py-10">
				<div className="text-center mb-8">
					<UserGroupIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
					<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
						Manage Volunteer Applications
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

				{isLoadingData && <div className="text-center py-10"><LoadingSpinner /> Loading applications...</div>}
				{errorData && <div className="text-center py-10 text-red-500">Error: {errorData}</div>}

				{!isLoadingData && !errorData && (
					<div className="shadow border-b border-gray-200 dark:border-gray-700 sm:rounded-lg overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
							<thead>
								<tr>
									<th className={thClasses}>Applicant</th>
									<th className={thClasses}>Submitted</th>
									<th className={thClasses}>Status</th>
									<th className={thClasses}>Areas of Interest</th>
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
											<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${app.status === 'Approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
												app.status === 'Rejected' || app.status === 'Withdrawn' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
													app.status === 'On Hold' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
														'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' // Pending Review, Contacted
												}`}>
												{app.status}
											</span>
										</td>
										<td className={`${tdClasses} max-w-xs truncate`} title={app.areasOfInterest || undefined}>
											{app.areasOfInterest || <span className="italic text-gray-400">N/A</span>}
										</td>
										<td className={tdClasses}>
											{app.reviewedBy || 'N/A'}
											{app.reviewDate && <div className="text-xs">({format(new Date(app.reviewDate), 'P')})</div>}
										</td>
										<td className={tdClasses}>
											{/* Link to a future detail/review page */}
											<Link href={`/admin/volunteer-applications/review/${app.id}`} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm">
												View/Review
											</Link>
											{/* <button onClick={() => handleReviewClick(app)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
												View/Review (Modal - NYI)
											</button> */}
										</td>
									</tr>
								)) : (
									<tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No volunteer applications match current filters.</td></tr>
								)}
							</tbody>
						</table>
					</div>
				)}
			</Container>

			{/* Placeholder for Review Modal if you implement it here later
			{isReviewModalOpen && selectedApplication && (
				<Modal onClose={handleCloseReviewModal} preventBackdropClickClose={true} size="3xl">
					<div className="p-6">
						Reviewing {selectedApplication.applicantName}
						TODO: Build review form/display for volunteer application
						<button onClick={handleCloseReviewModal}>Close</button>
					</div>
				</Modal>
			)}
			*/}
		</>
	);
}
