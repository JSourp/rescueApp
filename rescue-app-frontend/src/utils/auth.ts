export async function getAuth0AccessToken(): Promise<string | null> {
    try {
        // Fetch Auth0 Access Token from the internal Next.js API route
        const response = await fetch('/api/auth/token'); // Relative URL within the app

        if (!response.ok) {
            let errorMsg = `Failed to get access token: ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (_) { /* Ignore if body isn't JSON */ }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        if (!data.accessToken) {
            throw new Error("Access token not found in response from /api/auth/token");
        }
        console.log("Access Token successfully retrieved client-side."); // Add success log
        return data.accessToken;

    } catch (error) {
        console.error("Error fetching access token:", error);
        return null; // Return null on error
    }
}
