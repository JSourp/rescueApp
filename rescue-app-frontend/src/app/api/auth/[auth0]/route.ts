// src/app/api/auth/[auth0]/route.ts
import { handleAuth, handleCallback, AfterCallback, Session } from '@auth0/nextjs-auth0'; // Import necessary handlers/types
import { NextRequest } from 'next/server'; // Needed for typing req in AfterCallback

// Define the structure expected by your backend API
interface SyncUserPayload {
	externalProviderId: string; // This will be the Auth0 'sub'
	email: string;
	firstName?: string; // Optional, attempt to extract
	lastName?: string; // Optional, attempt to extract
}

// Define the afterCallback function
const afterCallback: AfterCallback = async (req: NextRequest, session: Session, state: unknown) => {
	// The session.user object contains the Auth0 profile information
	console.log('Auth0 session after callback:', session.user); // Good for debugging

	if (session.user?.sub && session.user?.email) {
		const payload: SyncUserPayload = {
			externalProviderId: session.user.sub,
			email: session.user.email,
		};

		// Attempt to parse first/last name from Auth0 profile (common fields)
		// Adjust based on what Auth0 actually returns (e.g., could be in 'name', 'nickname', 'given_name', 'family_name')
		const name = session.user.name || session.user.nickname;
		if (name && typeof name === 'string') {
			const nameParts = name.split(' ');
			payload.firstName = nameParts[0];
			if (nameParts.length > 1) {
				payload.lastName = nameParts.slice(1).join(' ');
			}
		}
		// Use specific claims if available (preferred)
		if (session.user.given_name) payload.firstName = session.user.given_name;
		if (session.user.family_name) payload.lastName = session.user.family_name;


		try {
			// --- Call your backend API to sync the user ---
			// Use an environment variable for your backend API base URL
			const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
			const syncUrl = `${apiBaseUrl}/users/sync`;

			console.log(`Calling backend sync endpoint: ${syncUrl} for user sub: ${payload.externalProviderId}`);

			const response = await fetch(syncUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					// Add any necessary security headers (e.g., an API key/secret) if your backend endpoint is protected
					// 'X-Internal-API-Key': process.env.INTERNAL_API_KEY || '',
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				// Log error but don't necessarily block login if sync fails initially
				const errorBody = await response.text();
				console.error(`Failed to sync user with backend API. Status: ${response.status}, Body: ${errorBody}`);
				// You might want more robust error handling here later
			} else {
				console.log(`Successfully synced user sub: ${payload.externalProviderId}`);
				// You could potentially add custom claims to the session here if the backend returns role info
				// const backendUser = await response.json();
				// session.user.app_role = backendUser.role; // Example
			}

		} catch (error) {
			console.error('Error calling backend sync API:', error);
			// Don't block login if the sync API call fails
		}
	} else {
		console.warn('Auth0 user session missing sub or email after callback. Cannot sync.');
	}

	// ALWAYS return the session object from afterCallback
	return session;
};


// Export the GET handler, passing the afterCallback function
export const GET = handleAuth({
	callback: handleCallback({ afterCallback })
});
