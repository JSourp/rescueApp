import { handleAuth, handleCallback, AfterCallback, Session } from '@auth0/nextjs-auth0';
import { NextRequest } from 'next/server';

// Define the afterCallback function
const afterCallback: AfterCallback = async (req: NextRequest, session: Session) => {
	// The session.user object contains the Auth0 profile information
	// Log it to see available claims from Auth0 (like sub, email, name, given_name, family_name, custom claims for roles)
	console.log('Auth0 session.user after callback:', JSON.stringify(session.user, null, 2));

	if (session.user?.sub && session.user?.email) {
		// Construct the payload to match the C# SyncUserRequest DTO's JsonPropertyNames
		const payloadForSyncApi = {
			sub: session.user.sub, // Auth0 User ID (subject claim)
			email: session.user.email,
			given_name: session.user.given_name,     // Standard OIDC claim for first name
			family_name: session.user.family_name,   // Standard OIDC claim for last name
			name: session.user.name,                 // Full name, often available
			nickname: session.user.nickname,         // Nickname, sometimes used
			picture: session.user.picture,           // Profile picture URL
			roles: session.user['https://rescueapp/roles'] || [], // Send roles array or empty array
		};

		try {
			const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
			if (!apiBaseUrl) {
				console.error("API_BASE_URL is not configured for user sync. User sync skipped.");
				return session; // Still return session to allow login
			}
			const syncUrl = `${apiBaseUrl}/users/sync`;

			console.log(`Calling backend sync endpoint: ${syncUrl} for user sub: ${payloadForSyncApi.sub}`);
			console.log(`Payload for sync: ${JSON.stringify(payloadForSyncApi)}`); // Log the actual payload

			const response = await fetch(syncUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payloadForSyncApi),
			});

			if (!response.ok) {
				const errorBody = await response.text(); // Read as text to capture any response
				console.error(`Failed to sync user with backend API. Status: ${response.status}, User sub: ${payloadForSyncApi.sub}, Response Body: ${errorBody.substring(0, 500)}`);
				// Log error but don't necessarily block login if sync fails initially
			} else {
				const syncedUserData = await response.json(); // Assuming your SyncUser returns the synced user
				console.log(`Successfully synced user sub: ${payloadForSyncApi.sub}. Synced data:`, syncedUserData);
			}

		} catch (error) {
			console.error('Error calling backend sync API:', error);
			// Don't block login if the sync API call fails, but log it.
		}
	} else {
		console.warn('Auth0 user session missing sub or email after callback. Cannot sync.');
	}

	// Return the session object from afterCallback
	return session;
};

// Export the GET handler, passing the afterCallback function
export const GET = handleAuth({
	callback: handleCallback({ afterCallback })
});
