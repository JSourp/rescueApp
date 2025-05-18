'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Container } from '@/components/Container';
import { LoadingSpinner } from '@/components/Icons';
import { UserGroupIcon } from '@heroicons/react/20/solid';
import { FosterListItem } from '@/types/fosterListItem';
import { UserProfile } from '@/types/userProfile';
import { useUser } from '@auth0/nextjs-auth0/client';
import { getAuth0AccessToken } from '@/utils/auth';
import { format } from 'date-fns';

// Define the type for the filters object (expand as needed)
interface FosterListFilters {
	// nameSearch: string; // Future: for searching by name
	// isActive: string; // 'true', 'false', or '' for all
}

// Fetch function for fosters
async function fetchFosters(
	// filters: FosterListFilters, // Add if/when filters are implemented
	sortBy: string,
	accessToken: string
): Promise<FosterListItem[]> {
	const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
	const endpoint = `${apiBaseUrl}/fosters`; // Route defined in GetFosters.cs
	const queryParams = new URLSearchParams();

	// if (filters.isActive) queryParams.append('isActive', filters.isActive);
	// if (filters.nameSearch) queryParams.append('nameSearch', filters.nameSearch);
	if (sortBy) queryParams.append('sortBy', sortBy);

	const url = `${endpoint}?${queryParams.toString()}`;
	console.log("Fetching fosters from URL:", url);

	try {
		const response = await fetch(url, {
			headers: { 'Authorization': `Bearer ${accessToken}` },
			cache: 'no-store'
		});
		if (!response.ok) {
			const err = await response.json();
			throw new Error(err.error?.message || `API Error: ${response.status}`);
		}
		const data = await response.json();
		console.log("Fetched fosters data:", data);
		return data as FosterListItem[];
	} catch (error) {
		console.error('Error fetching fosters:', error);
		throw error;
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

export default function AdminFostersPage() {
	const { user: auth0User, isLoading: isAuthLoading, error: authError } = useUser();
	const [fosters, setFosters] = useState<FosterListItem[]>([]);
	const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
	const [errorData, setErrorData] = useState<string | null>(null);
	const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
	const [isLoadingRole, setIsLoadingRole] = useState<boolean>(true);

	// TODO: Add filter states if implementing filters
	const [sortBy, setSortBy] = useState('lastname_asc'); // Default sort
	const sortingOptions = [
		{ value: 'lastname_asc', label: 'Name (A-Z)' },
		{ value: 'lastname_desc', label: 'Name (Z-A)' },
		{ value: 'approvalDate_desc', label: 'Approval Date (Newest)' },
		{ value: 'approvalDate_asc', label: 'Approval Date (Oldest)' },
		{ value: 'currentFosterCount_desc', label: 'Foster Count (Most)' },
		{ value: 'currentFosterCount_asc', label: 'Foster Count (Least)' },
	];

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
			setIsLoadingRole(false);
		};
		loadUserRole();
	}, [auth0User, isAuthLoading]); // Rerun when auth state changes

	// Fetch Fosters Data
	const loadFosters = useCallback(async () => {
		if (isAuthLoading || isLoadingRole || !currentUserRole || !['Admin', 'Staff'].includes(currentUserRole ?? '')) {
			if (!isAuthLoading && !isLoadingRole) setIsLoadingData(false);
			return;
		}
		setIsLoadingData(true); setErrorData(null);
		const token = await getAuth0AccessToken();
		if (!token) {
			setErrorData("Authentication token missing."); setIsLoadingData(false); return;
		}
		try {
			// const filters = { }; // Add filters here when implemented
			const fetchedFosters = await fetchFosters(/*filters,*/ sortBy, token);
			setFosters(fetchedFosters);
		} catch (err) { setErrorData(err instanceof Error ? err.message : 'Failed to load fosters'); }
		finally { setIsLoadingData(false); }
	}, [sortBy, isAuthLoading, isLoadingRole, currentUserRole]); // Add filter states to dependency array when added

	useEffect(() => { loadFosters(); }, [loadFosters]);

	// --- Handlers ---
	const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value);
	// TODO: Add filter change handlers

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
		<Container className="py-10">
			<div className="text-center mb-8">
				<UserGroupIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
				<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
					Manage Fosters
				</h1>
			</div>

			{/* TODO: Filters UI (e.g., search by name, filter by active status) */}
			<div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow flex flex-wrap gap-4 items-end">
				<div>
					<label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort By</label>
					<select id="sortBy" value={sortBy} onChange={handleSortChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-sm">
						{sortingOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
					</select>
				</div>
				{/* Add filter inputs/selects here */}
			</div>

			{isLoadingData && <div className="text-center py-10"><LoadingSpinner /> Loading fosters...</div>}
			{errorData && <div className="text-center py-10 text-red-500">Error: {errorData}</div>}

			{!isLoadingData && !errorData && (
				<div className="shadow border-b border-gray-200 dark:border-gray-700 sm:rounded-lg overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
						<thead>
							<tr>
								<th className={thClasses}>Name</th>
								<th className={thClasses}>Contact</th>
								<th className={thClasses}>Approved</th>
								<th className={thClasses}>Status</th>
								<th className={thClasses}>Animals Fostering</th>
								<th className={thClasses}>Availability Notes</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
							{fosters.length > 0 ? fosters.map((foster, index) => (
								<tr key={foster.userId} className={index % 2 === 0 ? "bg-white dark:bg-gray-800/50" : "bg-gray-50 dark:bg-gray-900/50"}>
									<td className={tdClasses}>
										<Link href={`/admin/fosters/${foster.userId}`} className="text-text-link hover:text-text-link dark:text-text-link dark:hover:text-text-link text-sm">
											{foster.firstName} {foster.lastName}
										</Link>
									</td>
									<td className={tdClasses}>
										<div>{foster.email}</div>
										<div className="text-xs text-gray-500">{foster.primaryPhone || 'N/A'}</div>
									</td>
									<td className={tdClasses}>
										{format(new Date(foster.approvalDate), 'P')}
									</td>
									<td className={tdClasses}>
										<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${foster.isActiveFoster ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
											{foster.isActiveFoster ? 'Active' : 'Inactive'}
										</span>
									</td>
									<td className={`${tdClasses} text-center`}>
										{foster.currentFosterCount}
									</td>
									<td className={`${tdClasses} max-w-xs truncate`} title={foster.availabilityNotes || undefined}>
										{foster.availabilityNotes || <span className="italic text-gray-400">None</span>}
									</td>
								</tr>
							)) : (
								<tr><td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No fosters found.</td></tr>
							)}
						</tbody>
					</table>
				</div>
			)}
		</Container>
	)
}
