import { getAccessToken, withApiAuthRequired } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';

// Wrap with withApiAuthRequired to ensure only logged-in users can call this
export const GET = withApiAuthRequired(async function GET(req) {
	try {
		// getAccessToken securely retrieves the Access Token from the session cookie
		// It needs the audience for backend API to get the correct token
		const { accessToken } = await getAccessToken({
			// Define scopes needed by /api/users/me endpoint, if any beyond openid profile email
			// scopes: ['openid', 'profile', 'email', 'update:profile']
		});

		if (!accessToken) {
			return NextResponse.json({ error: 'Access Token not found in session' }, { status: 500 });
		}

		// Return the access token to the client
		return NextResponse.json({ accessToken });

	} catch (error: any) {
		console.error("Error getting access token:", error);
		return NextResponse.json(
			{ error: error.message || 'Failed to retrieve access token' },
			{ status: error.status || 500 }
		);
	}
});
