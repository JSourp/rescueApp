import { getSession, withApiAuthRequired } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';

export const GET = withApiAuthRequired(async function token(req) {
	// This route is called by the client-side getAccessToken() hook.
	// We use getSession() here on the server to securely access the user's session cookie.
	const session = await getSession(req, new NextResponse());

	if (!session || !session.accessToken) {
		// This case should ideally not be hit if withApiAuthRequired works, but it's good practice.
		return NextResponse.json({ error: 'No access token found' }, { status: 401 });
	}

	// We return the access token in a JSON object.
	return NextResponse.json({ accessToken: session.accessToken });
});
