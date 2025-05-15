import { UserProfile } from '@/types/userProfile'; // Ensure your UserProfile type is defined

export async function fetchUserProfileServerSide(accessToken: string): Promise<UserProfile | null> {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    if (!apiBaseUrl) {
        console.error("NEXT_PUBLIC_API_BASE_URL not configured for server-side user profile fetch.");
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
