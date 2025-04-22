// src/app/profile/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Container } from '@/components/Container';
import { format } from 'date-fns'; // For formatting dates
import { LoadingSpinner } from "@/components/Icons";
import { useRouter } from 'next/router';

interface UserProfile {
	id: string;
	externalProviderId?: string;
	firstName: string;
	lastName: string;
	email: string;
	role: string;
	isActive: boolean;
	dateCreated: string;
	lastLoginDate?: string | null;
}

function ProfilePage() {
	// Get basic user info from Auth0 session (for immediate display/checks)
	const { user: auth0User, isLoading: auth0Loading, error: auth0Error } = useUser();

	// State for profile data fetched from our backend
	const [profileData, setProfileData] = useState<UserProfile | null>(null);
	const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
	const [errorData, setErrorData] = useState<string | null>(null);
	const [isEditing, setIsEditing] = useState<boolean>(false);
	const router = useRouter();

	// --- Effect for redirecting if not logged in ---
	useEffect(() => {
		// Only check/redirect after Auth0 has finished loading and if there's no user and no error
		if (!auth0Loading && !auth0User && !auth0Error) {
			// Redirect to the homepage
			router.push('/');
		}
	}, [auth0Loading, auth0User, auth0Error, router]);

	useEffect(() => {
		const fetchProfileData = async () => {
			// Only fetch if Auth0 user is loaded (prevent fetching before login redirect completes)
			if (auth0Loading || !auth0User) {
				// If auth0 isn't loading and there's no user, something went wrong (handled by HOC)
				// If auth0 is loading, just wait.
				setIsLoadingData(auth0Loading); // Reflect auth0 loading status initially
				return;
			}

			setIsLoadingData(true);
			setErrorData(null);

			try {
				// --- Fetch data from YOUR backend API ---
				// NOTE: Fetching from Client Components to backend APIs usually requires
				// sending the user's Access Token for authentication.
				// The @auth0/nextjs-auth0 SDK provides ways to do this, often involving
				// creating an API route in Next.js (/api/auth/token) to get the token,
				// or using a custom fetch wrapper.
				// For simplicity now, we'll use a basic fetch, assuming the backend endpoint
				// might be temporarily unsecured or secured via another method (like function keys).
				// TODO: Implement secure token fetching and sending for production.

				const response = await fetch('/api/users/me'); // Relative URL assumes Next.js hosts API route proxying to Azure Function, OR use full backend URL

				if (!response.ok) {
					if (response.status === 401 || response.status === 403) {
						throw new Error("Unauthorized: Could not fetch profile.");
					}
					if (response.status === 404) {
						throw new Error("Profile not found. Please contact support if this seems wrong.");
					}
					throw new Error(`Failed to fetch profile data. Status: ${response.status}`);
				}

				const data: UserProfile = await response.json();
				setProfileData(data);
			} catch (err) {
				console.error("Profile fetch error:", err);
				setErrorData(err instanceof Error ? err.message : 'An unknown error occurred');
			} finally {
				setIsLoadingData(false);
			}
		};

		fetchProfileData();
	}, [auth0Loading, auth0User]); // Re-run if Auth0 loading state or user changes

	// Display Error state (handles both Auth0 error and data fetching error)
	if (auth0Error) {
		return <Container className="text-center py-10 text-red-500">Auth Error: {auth0Error.message}</Container>;
	}
	if (errorData) {
		return <Container className="text-center py-10 text-red-500">Error loading profile: {errorData}</Container>;
	}
	// Should not happen if withAuthenticationRequired works, but defensive check
	if (!auth0User || !profileData) {
		return <Container className="text-center py-10 text-gray-500">User not found or profile unavailable.</Container>;
	}

	// --- Display Profile Data (Read Only for now) ---
	return (
		<Container className="py-10">
			<h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Your Profile</h1>
			<div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 md:p-8 max-w-2xl mx-auto">
				{/* Display Section */}
				{!isEditing ? (
					<div className="space-y-4">
						{/* Display basic user info */}
						<ProfileDetail label="First Name" value={profileData.firstName} />
						<ProfileDetail label="Last Name" value={profileData.lastName} />
						<ProfileDetail label="Email" value={profileData.email} />
						<ProfileDetail label="Role" value={profileData.role} />
						<ProfileDetail label="Account Status" value={profileData.isActive ? 'Active' : 'Inactive'} />
						<ProfileDetail label="Member Since" value={format(new Date(profileData.dateCreated), 'PP')} />
						{profileData.lastLoginDate && (
							<ProfileDetail label="Last Login" value={format(new Date(profileData.lastLoginDate), 'Pp')} />
						)}

						<div className="pt-6 text-right">
							<button
								onClick={() => setIsEditing(true)}
								className="bg-indigo-500 hover:bg-indigo-700 text-white font-medium py-2 px-5 rounded-md transition duration-300"
							>
								Edit Profile
							</button>
						</div>
					</div>
				) : (
					// --- Edit Form Section (Placeholder for now) ---
					<div>
						<h2 className="text-xl font-semibold mb-4">Edit Profile</h2>
						<p className="mb-4 text-gray-600 dark:text-gray-400">
							Editing functionality will be added here. Use React Hook Form to manage inputs for editable fields (e.g., Phone, Address). Email and Role are typically not user-editable.
						</p>
						{/* TODO: Add React Hook Form integration here */}
						<div className="flex justify-end gap-3 mt-6">
							<button
								type="button"
								onClick={() => setIsEditing(false)} // Cancel edits
								className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-5 rounded-md transition duration-300"
							>
								Cancel
							</button>
							<button
								type="submit" // This would be the submit button for the form
								disabled // Disable until form is implemented
								className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-5 rounded-md transition duration-300 disabled:opacity-50"
							>
								Save Changes
							</button>
						</div>
					</div>
				)}
			</div>
		</Container>
	);
}

// Helper component (keep as is)
const ProfileDetail = ({ label, value }: { label: string; value: string | undefined | null | boolean }) => {
	// Handle boolean display
	const displayValue = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value;
	if (displayValue === undefined || displayValue === null || displayValue === '') return null;
	return (
		<div>
			<dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
			<dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{displayValue}</dd>
		</div>
	);
};

export default ProfilePage;
