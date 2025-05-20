// src/app/api/auth/[auth0]/route.ts
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
			// Ensure your custom roles claim name is correct here
			// It might be namespaced like "https://your-app-namespace.com/roles"
			// Check your Auth0 Rules or Actions where you add this claim.
			roles: session.user['https://rescueapp/roles'] || [], // Send roles array or empty array
		};

		try {
			const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL; // Your Azure Function base URL
			if (!apiBaseUrl) {
				console.error("API_BASE_URL is not configured for user sync. User sync skipped.");
				// Potentially throw an error or handle this more gracefully if sync is critical
				return session; // Still return session to allow login
			}
			const syncUrl = `${apiBaseUrl}/users/sync`;

			console.log(`Calling backend sync endpoint: ${syncUrl} for user sub: ${payloadForSyncApi.sub}`);
			console.log(`Payload for sync: ${JSON.stringify(payloadForSyncApi)}`); // Log the actual payload

			const response = await fetch(syncUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					// No Authorization Bearer token is typically sent from this Next.js backend route
					// to your Azure Function if the SyncUser function is AuthorizationLevel.Anonymous
					// and trusts this server-to-server call.
					// If SyncUser.cs *does* require its own auth (e.g., an API key for internal calls), add it here.
					// 'X-Internal-API-Key': process.env.INTERNAL_API_KEY_FOR_SYNC,
				},
				body: JSON.stringify(payloadForSyncApi),
			});

			if (!response.ok) {
				const errorBody = await response.text(); // Read as text to capture any response
				console.error(`Failed to sync user with backend API. Status: ${response.status}, User sub: ${payloadForSyncApi.sub}, Response Body: ${errorBody.substring(0, 500)}`);
				// Log error but don't necessarily block login if sync fails initially
				// You might want more robust error handling or retry logic here later
			} else {
				const syncedUserData = await response.json(); // Assuming your SyncUser returns the synced user
				console.log(`Successfully synced user sub: ${payloadForSyncApi.sub}. Synced data:`, syncedUserData);
				// OPTIONAL: Add custom data from your DB to the Auth0 session if needed by the client immediately
				// For example, if your SyncUser returns the local DB user ID or a confirmed role:
				// session.user.appUserId = syncedUserData.id;
				// session.user.appRole = syncedUserData.role; // If role is confirmed/set by backend
			}

		} catch (error) {
			console.error('Error calling backend sync API:', error);
			// Don't block login if the sync API call fails, but log it.
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
	// You can also add other handlers like login, logout, profile here if needed
	// e.g., login: handleLogin({ returnTo: '/admin' })
});
