import React from 'react';
import { getSession } from '@auth0/nextjs-auth0';
import { redirect } from 'next/navigation';
import { Container } from '@/components/Container';
import Link from 'next/link';
import { UserProfile } from '@/types/userProfile'; // Your existing type
import { FosterDetailDto as FosterDetail } from '@/types/fosterDetail';
import { format } from 'date-fns';
import { HeartIcon, PencilSquareIcon, ArrowUturnLeftIcon } from '@/components/Icons';
import { UserIcon, HomeIcon, PlusCircleIcon } from '@heroicons/react/20/solid';
import { fetchUserProfileServerSide } from '@/utils/serverAppUtils';
import FosterDetailClientSection from '@/components/admin/FosterDetailClientSection';

// --- Fetch Function (Server-Side) ---
async function fetchFosterDetails(userId: string, accessToken: string | undefined): Promise<FosterDetail | null> {
	const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
	if (!apiBaseUrl) {
		const errorMessage = "API Base URL is not configured. Please check environment variables.";
		console.error(errorMessage);
		throw new Error(errorMessage);
	}
	const endpoint = `${apiBaseUrl}/fosters/${userId}`; // Ensure route matches backend
	const queryParams = new URLSearchParams();

	const url = `${endpoint}?${queryParams.toString()}`;
	console.log("Fetching fosters from URL:", url);

	try {
		const response = await fetch(url, {
			headers: { 'Authorization': `Bearer ${accessToken}` },
			cache: 'no-store'
		});
		if (!response.ok) {
			const errorText = await response.text();
			console.error(`API Error fetching foster ${userId}: ${response.status}`, errorText.substring(0, 500));
			return null;
		}
		return await response.json() as FosterDetail;
	} catch (error) {
		console.error(`Error fetching foster details for User ID ${userId}:`, error);
		return null;
	}
}

// Detail Item Helper for this page
const DetailItem = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => {
	if (children === null || children === undefined || (typeof children === 'string' && children.trim() === '')) {
		children = <span className="italic text-gray-500 dark:text-gray-400">N/A</span>;
	}
	return (
		<div className={`py-2 sm:grid sm:grid-cols-3 sm:gap-4 ${className}`}>
			<dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
			<dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:mt-0 sm:col-span-2">{children}</dd>
		</div>
	);
};

export default async function AdminFosterDetailPage({ params }: { params: { userId: string } }) {
	const session = await getSession();
	if (!session?.user || !session.accessToken) {
		redirect(`/admin-login?returnTo=/admin/fosters/${params.userId}`);
	}

	// Server-Side Role Check
	const userProfile = await fetchUserProfileServerSide(session.accessToken);
	if (!userProfile) { redirect(`/admin-login?error=profile_fetch_failed&returnTo=/admin/fosters/${params.userId}`); }
	const allowedRoles = ['Admin', 'Staff'];
	if (!userProfile.role || !allowedRoles.includes(userProfile.role)) {
		redirect('/admin?error=unauthorized');
	}

	const foster = await fetchFosterDetails(params.userId, session.accessToken);

	if (!foster) {
		return (
			<Container className="py-10 text-center">
				<h1 className="text-2xl font-bold text-red-600">Foster Not Found</h1>
				<p className="mt-4">Could not find details for foster with User ID: {params.userId}</p>
				<Link href="/admin/fosters" className="mt-6 inline-block text-text-link hover:underline">Back to Fosters List</Link>
			</Container>
		);
	}

	return (
		<Container className="py-10">
			<div className="mb-6">
				<Link href="/admin/fosters" className="text-sm text-text-link hover:underline dark:text-text-link">&larr; Back to Fosters List</Link>
			</div>

			{/* --- Main Header --- */}
			<div className="mb-8 pb-4 border-b border-gray-200 dark:border-gray-700">
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
					<div>
						<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
							<UserIcon className="w-8 h-8 text-text-link dark:text-text-link" />
							{foster.firstName} {foster.lastName}
						</h1>
						<span className={`mt-1 inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${foster.isActiveFoster && foster.isUserActive ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100'}`}>
							{foster.isActiveFoster && foster.isUserActive ? 'Active Foster & User' : foster.isUserActive ? 'User Active (Foster Inactive)' : 'User Inactive'}
						</span>
						<p className="text-sm text-gray-500 dark:text-gray-400">User Role: {foster.userRole}</p>
					</div>
				</div>
			</div>
			{/* --- Foster Details Grid --- */}
			<FosterDetailClientSection fosterData={foster} />
		</Container>
	);
}
