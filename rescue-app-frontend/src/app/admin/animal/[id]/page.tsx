import React from 'react';
import { getSession } from '@auth0/nextjs-auth0';
import { redirect } from 'next/navigation';
import { Container } from '@/components/Container';
import { Animal } from '@/types/animalListItem';
import { UserProfile } from '@/types/userProfile';
import { AnimalDocument } from '@/types/animalDocument';
import Link from 'next/link';
// Import the NEW Client Component we will create below
import AdminAnimalDetailClientUI from '@/components/admin/AdminAnimalDetailClientUI';

async function fetchAnimalDetails(id: number, accessToken: string | undefined): Promise<Animal | null> {
  console.log(`ADMIN FETCH: Fetching details for animal ID: ${id}`);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl || !accessToken) return null; // Need base URL and token
  const url = `${apiBaseUrl}/animals/${id}`;
  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      cache: 'no-store'
    });
    if (!response.ok) { throw new Error(`API Error: ${response.status}`); }
    return await response.json() as Animal;
  } catch (error) {
    console.error(`Error fetching animal details for ID ${id}:`, error);
    return null;
  }
}

async function fetchAnimalDocuments(id: number, accessToken: string | undefined): Promise<AnimalDocument[]> {
  console.log(`ADMIN FETCH: Fetching documents for animal ID: ${id}`);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl || !accessToken) return [];
  const url = `${apiBaseUrl}/animals/${id}/documents`;
  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      cache: 'no-store'
    });
    if (!response.ok) { throw new Error(`API Error: ${response.status}`); }
    return await response.json() as AnimalDocument[];
  } catch (error) {
    console.error(`Error fetching documents for animal ID ${id}:`, error);
    return []; // Return empty array on error
  }
}

async function fetchCurrentAdminUserProfile(accessToken: string | undefined): Promise<UserProfile | null> {
  console.log(`ADMIN FETCH: Fetching current user profile`);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl || !accessToken) return null;
  const url = `${apiBaseUrl}/users/me`;
  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      cache: 'no-store'
    });
    if (!response.ok) { throw new Error(`API Error: ${response.status}`); }
    return await response.json() as UserProfile;
  } catch (error) {
    console.error(`Error fetching user profile:`, error);
    return null;
  }
}

// Page component is async to use await for session and data
export default async function AdminAnimalDetailPage({ params }: { params: { id: string } }) {
  const animalIdStr = params?.id;
  const animalId = parseInt(animalIdStr, 10);

  if (isNaN(animalId)) {
    return <Container className="py-10 text-center text-red-500">Invalid Animal ID.</Container>;
  }

  // 1. Get session server-side
  const session = await getSession();
  const auth0User = session?.user;
  const accessToken = session?.accessToken; // Token needed for API calls

  // 2. Redirect if no session/token
  if (!auth0User || !accessToken) {
    // Not logged in or session invalid/expired, redirect to login
    console.warn("Admin Animal Detail: No session/token found, redirecting.");
    // Redirect to the dedicated admin login page, telling it to return here
    redirect(`/admin-login?returnTo=${encodeURIComponent(`/admin/animal/${animalId}`)}`);
  }

  // 3. Fetch Data Concurrently
  const [animal, documents, currentUserProfile] = await Promise.all([
    fetchAnimalDetails(animalId, accessToken),
    fetchAnimalDocuments(animalId, accessToken),
    fetchCurrentAdminUserProfile(accessToken)
  ]);

  // 4. Handle Animal Not Found
  if (!animal) {
    return (
      <Container className="py-10 text-center">
        <h1 className="text-2xl font-bold text-red-600">Animal Not Found</h1>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Could not find details for animal with ID: {animalId}</p>
        <Link href="/admin/manage-animals" className="mt-6 inline-block text-indigo-600 hover:underline">Back to Animal List</Link>
      </Container>
    );
  }

  // 5. Get user role (defaulting to Guest if profile fetch fails)
  const userRole = currentUserProfile?.role ?? 'Guest'; // Default to guest if profile/role fetch failed
  if (userRole === 'Guest') {
    // Although Guests might see the list, allow view but actions will be hidden later based on role checks in JSX
    console.warn(`Admin Animal Detail: User ${auth0User.sub} has role '${userRole}', showing read-only view.`);
  }

  // 6. Render the Client Component, passing fetched data as props
  return (
    <AdminAnimalDetailClientUI
      initialAnimal={animal}
      initialDocuments={documents}
      initialUserRole={userRole}
    />
  );
}
