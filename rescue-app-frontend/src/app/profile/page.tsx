import React from 'react';
import { getSession } from '@auth0/nextjs-auth0';
import { redirect } from 'next/navigation';
import { Container } from '@/components/Container';
import { LoadingSpinner } from "@/components/Icons";
import { format } from 'date-fns';
// Import the type - can be shared between server and client
import { UserProfile } from '@/types/userProfile';
// Import the display component (which will be Client Component)
import ProfileDisplay from '@/components/ProfileDisplay';

// This function needs to run server-side, potentially accepting the access token
// For simplicity, let's assume it's called from within the page for now
async function fetchProfileData(auth0UserId: string): Promise<UserProfile | null> {
	const apiBaseUrl = process.env.INTERNAL_API_BASE_URL || 'http://localhost:7071/api';
	const url = `${apiBaseUrl}/users/me`; // Assuming /users/me identifies user via token implicitly

	console.log("Fetching server-side profile for user:", auth0UserId); // Server-side log

	try {
		// --- Server-Side Fetch ---
		// IMPORTANT: When calling backend API *from Next.js server*,
		// you don't typically pass the user's access token directly.
		// Your backend API (/api/users/me) needs a way to securely identify the user
		// based on the incoming request (e.g., validating a session cookie set by Auth0 SDK,
		// or you might need a different backend approach if calling directly from server component)
		// OR, alternatively, pass the auth0UserId securely if the API accepts it for lookup.
		// For now, let's assume the API magically knows the user or doesn't need auth for this specific fetch (less secure).
		// TODO: Implement proper server-to-server auth or session handling for this fetch.

		const response = await fetch(url, {
			method: 'GET',
			// headers: { 'Authorization': `Bearer ${accessToken}` }, // If passing token
			cache: 'no-store' // Don't cache sensitive user data
		});

		if (!response.ok) {
			if (response.status === 404) return null; // User might exist in Auth0 but not synced yet
			throw new Error(`API Error: ${response.status}`);
		}
		const data = await response.json();
		return data as UserProfile; // Assume API returns camelCase still
	} catch (error) {
		console.error("Server-side profile fetch error:", error);
		// Depending on error, maybe redirect to error page or return null
		return null;
	}
}

export default async function ProfilePage() {
	// 1. Get session server-side
	const session = await getSession();
	const auth0User = session?.user;

	// 2. Redirect if no user session found
	if (!auth0User?.sub) {
		console.log("No Auth0 session found, redirecting Home.");
		redirect('/'); // Use Next.js redirect
	}

	// 3. Fetch profile data from backend API (server-side)
	// Pass the auth0 user ID (sub) securely if API requires it
	const profileData = await fetchProfileData(auth0User.sub);

	// 4. Handle case where profile data couldn't be fetched
	if (!profileData) {
		return (
			<Container className="text-center py-10">
				<h1 className="text-3xl font-bold mb-4">My Profile</h1>
				<p className="text-red-500">Could not load profile data from the database.</p>
				<p className="text-sm text-gray-500 mt-2">Your login succeeded, but we couldn&apos;t find your associated application profile. Please contact support.</p>
				<p className="text-xs mt-4">Auth ID: {auth0User.sub}</p> {/* Display ID for support */}
				<a href="/api/auth/logout" className="mt-4 inline-block text-indigo-600 hover:underline">Logout</a>
			</Container>
		);
	}

	// 5. Render the page, passing data to a Client Component for potential interactivity
	return (
		<Container className="py-10">
			<h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Your Profile</h1>
			{/* Pass fetched data to a Client Component that handles display/editing */}
			<ProfileDisplay initialProfileData={profileData} />
		</Container>
	);
}
