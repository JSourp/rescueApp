import { getSession, withApiAuthRequired } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';

export const GET = withApiAuthRequired(async function token(req) {
	// This route is called by the client-side getAccessToken() hook.
	// We use getSession() here on the server to securely access the user's session cookie.
	// This correctly uses the incoming request object ("req") to stay within the request scope.
	const session = await getSession(req, new NextResponse());

	if (!session || !session.accessToken) {
	  return NextResponse.json({ error: 'No access token found in session' }, { status: 401 });
  }

	// We return the access token found in the session.
	return NextResponse.json({ accessToken: session.accessToken });
});
