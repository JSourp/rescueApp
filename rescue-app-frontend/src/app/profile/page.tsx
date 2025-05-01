import React from 'react';
import { getSession } from '@auth0/nextjs-auth0';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { Container } from '@/components/Container';
import { LoadingSpinner } from "@/components/Icons";
import { format } from 'date-fns';
// Import the type - can be shared between server and client
import { UserProfile } from '@/types/userProfile';
// Import the display component (which will be Client Component)
import ProfileDisplay from '@/components/ProfileDisplay';

// --- Fetch function to ACCEPT and USE the accessToken ---
async function fetchProfileData(accessToken: string | undefined | null): Promise<UserProfile | null> {
	// 1. Check if we even received a token to send
	if (!accessToken) {
		console.error("fetchProfileData: Attempted to fetch profile without an access token.");
		// Returning null will trigger the "Could not load profile data" message on the page
		return null;
	}

	// Use the public API base URL defined in environment variables
	const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
	if (!apiBaseUrl) {
		console.error("fetchProfileData: NEXT_PUBLIC_API_BASE_URL environment variable is not set.");
		return null;
	}
	const url = `${apiBaseUrl}/users/me`;

	console.log("Fetching server-side profile from:", url);

	try {
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				// --- 2. Add the Authorization header ---
				'Authorization': `Bearer ${accessToken}`
			},
			cache: 'no-store' // Don't cache user profile data on the server component fetch
		});

		if (!response.ok) {
			// Log specific errors for debugging backend issues
			console.error(`API Error fetching profile (${url}): ${response.status} ${response.statusText}`);
			if (response.status === 401 || response.status === 403) {
				console.error("API returned Unauthorized/Forbidden. Check token validation on backend or token audience/scope.");
			}
			// Return null to indicate failure to load profile data
			return null;
		}
		const data = await response.json();

		return data as UserProfile;
	} catch (error) {
		console.error("Server-side profile fetch error:", error);
		return null;
	}
}

export default async function ProfilePage() {
	// 0. Logging Session data for debugging
	try {
		const headerList = headers();
		const cookieHeader = headerList.get('cookie');
		console.log('--- VERCEL /profile Request Cookie Header ---');
		console.log(cookieHeader || 'Cookie header not found');
		console.log('--- appSession present in header?:', cookieHeader?.includes('appSession=') ?? false, '---');
	} catch (e) {
		console.error("Error reading headers:", e);
	}

	// 1. Get session server-side
	const session = await getSession();
	console.log('Profile Page Session:', session);
	console.log('Access Token value:', session?.accessToken);
	const auth0User = session?.user;
	const accessToken = session?.accessToken;

	// 2. Redirect if no user session found.
	if (!auth0User?.sub) {
		console.log("No Auth0 session found, redirecting Home.");
		redirect('/'); // Use Next.js redirect
	}

	// 3. Check if Access Token exists ---
	// It might be missing if Auth0 isn't configured to issue one for your API audience
	if (!accessToken) {
		console.error("Access Token missing from session!");
		return (
			<Container className="text-center py-10">
				<h1 className="text-3xl font-bold mb-4">Profile Access Error</h1>
				<p className="text-red-500">Could not retrieve necessary credentials (Access Token) to load your profile.</p>
				<p className="text-sm text-gray-500 mt-2">This might be due to application configuration issues. Please contact support.</p>
				<a href="/api/auth/logout" className="mt-4 inline-block text-text-link hover:underline">Logout</a>
			</Container>
		);
	}

	// 4. Fetch profile data FROM YOUR BACKEND using the access token ---
	const profileData = await fetchProfileData(accessToken);

	// 5. Handle case where profile data couldn't be fetched from your API
	if (!profileData) {
		return (
			<Container className="text-center py-10">
				<h1 className="text-3xl font-bold mb-4">My Profile</h1>
				{/* Updated message: Distinguish between API error and missing profile */}
				<p className="text-red-500">Could not load your profile data from our system.</p>
				<p className="text-sm text-gray-500 mt-2">Your login succeeded, but we encountered an issue retrieving your details. Please try again later or contact support.</p>
				<p className="text-xs mt-4">Auth ID: {auth0User.sub}</p>
				<a href="/api/auth/logout" className="mt-4 inline-block text-text-link hover:underline">Logout</a>
			</Container>
		);
	}

	// 6. Render the page with the fetched data
	return (
		<Container className="py-10">
			<h1 className="text-center text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Your Profile</h1>
			{/* Pass fetched data to the Client Component */}
			<ProfileDisplay initialProfileData={profileData} />
		</Container>
	);
}
