// src/app/graduates/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Container } from '@/components/Container';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns'; // For formatting the adoption date

// Define or import a type for the graduate data including adoptionDate
interface GraduateAnimal {
  id: number;
  name: string | null;
  imageUrl: string | null; // Expecting camelCase from API
  animalType: string | null;
  breed: string | null;
  gender: string | null;
  adoptionDate: string; // Expecting date as ISO string from JSON
}

// --- Fetch function targeting the new endpoint ---
async function fetchGraduates(filters: {
  gender: string;
  animal_type: string; // Use keys backend expects for filtering
  breed: string;
}, sortBy: string): Promise<GraduateAnimal[]> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  // --- Use the NEW graduates endpoint ---
  const endpoint = `${apiBaseUrl}/graduates`;
  // --- ---

  const queryParams = new URLSearchParams();

  // Add user-selectable filters (use keys backend expects)
   if (filters.gender) queryParams.append('gender', filters.gender);
   if (filters.animal_type) queryParams.append('animal_type', filters.animal_type);
   if (filters.breed) queryParams.append('breed', filters.breed);

  // Add sorting parameter
  queryParams.append('sortBy', sortBy); // e.g., 'adoption_date_desc'

  const url = `${endpoint}?${queryParams.toString()}`;

  console.log("Fetching graduates from URL:", url);

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
       const errorBody = await response.text();
       console.error('API Error Response Body:', errorBody);
       throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data as GraduateAnimal[];
  } catch (error) {
    console.error('Error fetching graduates:', error);
    return [];
  }
}

// --- Main Page Component ---
export default function GraduatesPage() {
  const [graduates, setGraduates] = useState<GraduateAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- State for filters (similar to available-animals) ---
  const [genderFilter, setGenderFilter] = useState<string>('');
  const [animalTypeFilter, setAnimalTypeFilter] = useState<string>(''); // Changed key to snake_case for filter object
  const [breedFilter, setBreedFilter] = useState<string>('');
  const [animalTypes, setAnimalTypes] = useState<string[]>([]); // Still need types for filter dropdown

   // --- UPDATED Sorting state and options ---
   const [sortBy, setSortBy] = useState('adoption_date_desc'); // Default: Most Recent
   const sortingOptions = [
    { value: 'adoption_date_desc', label: 'Most Recent' },
    { value: 'adoption_date_asc', label: 'Least Recent' },
    // Add other relevant sort options if backend supports (e.g., name)
  ];
  // --- ---

   // Fetch animal types for filter dropdown (reuse existing function)
   useEffect(() => {
        async function loadTypes() {
             const response = await fetch('/api/animals/types'); // Assuming this endpoint exists
             if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
             const types = await response.json();
             setAnimalTypes(types || []);
        }
        loadTypes();
   }, []);


  // Fetch graduates when filters or sort order change
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Pass snake_case keys matching backend filter expectation
        const fetchedGraduates = await fetchGraduates(
            { gender: genderFilter, animal_type: animalTypeFilter, breed: breedFilter },
            sortBy
        );
        setGraduates(fetchedGraduates);
      } catch (err) {
         console.error("Error loading graduates:", err);
         setError(err instanceof Error ? err.message : 'Failed to load graduates');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [genderFilter, animalTypeFilter, breedFilter, sortBy]); // Dependencies


  // --- Handlers for filters/sort (similar to available-animals) ---
  const handleAnimalTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => setAnimalTypeFilter(e.target.value);
  const handleGenderFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => setGenderFilter(e.target.value);
  // Add handler for breed filter if UI exists
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value);
  // --- ---


  // --- JSX Rendering ---
  return (
    <Container className="py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Our Graduates</h1>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
        Celebrating the happy tails and second chances!
      </p>

      {/* Filtering Options UI (reuse from available-animals) */}
      <div className="flex flex-wrap items-center justify-center mb-6 gap-4">
        {/* Animal Type Filter */}
        <select value={animalTypeFilter} onChange={handleAnimalTypeFilterChange} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
          <option value="">All Types</option>
          {animalTypes.map(type => ( <option key={type} value={type}>{type}</option> ))}
        </select>
        {/* Gender Filter */}
         <select value={genderFilter} onChange={handleGenderFilterChange} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
           <option value="">All Genders</option>
           <option value="Male">Male</option>
           <option value="Female">Female</option>
         </select>
         {/* Breed Filter (Add input if needed) */}
         {/* Sort By Dropdown */}
         <select value={sortBy} onChange={handleSortChange} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
            {sortingOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
         </select>
      </div>

      {/* Loading / Error States */}
      {loading && <div className="text-center py-10">Loading graduates...</div>}
      {error && <div className="text-center py-10 text-red-500">Error: {error}</div>}

      {/* Graduates Grid */}
      {!loading && !error && (
        <div className="flex justify-center">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {graduates.length > 0 ? (
              graduates.map((graduate) => (
                <div
                  key={graduate.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
                >
                  {/* Optional Link to original profile if desired, or just display info */}
                  {/* <Link href={`/animal/${graduate.id}`} className="block"> */}
                    <div className="text-center">
                      <h2 className="text-xl font-semibold py-2 text-gray-900 dark:text-gray-100 truncate px-2">
                        {graduate.name}
                      </h2>
                    </div>
                    <Image
                       src={graduate.imageUrl || '/placeholder-image.png'} // Use camelCase
                       alt={graduate.name || 'Adopted animal'}
                       width={400}
                       height={300}
                       className="w-full h-64 object-cover"
                       priority={graduates.indexOf(graduate) < 4}
                     />
                  {/* </Link> */}
                  <div className="p-4 text-center">
                     {/* Display Adoption Date */}
                     <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                        Adopted: {format(new Date(graduate.adoptionDate), 'MMM d, yyyy')} {/* Format the date */}
                     </p>
                     {/* Optionally display Type/Breed/Gender */}
                     <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {graduate.breed} ({graduate.animalType}) - {graduate.gender}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="col-span-full text-center text-gray-500 dark:text-gray-400 py-10">
                No graduates match the current filters.
              </p>
            )}
          </div>
        </div>
      )}
    </Container>
  );
}

// Helper function to fetch animal types (assuming it exists)
async function fetchAnimalTypes(): Promise<string[]> {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    try {
      const response = await fetch(`${apiBaseUrl}/animals/types`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      return await response.json() as string[];
    } catch (error) {
      console.error('Error fetching animal types:', error);
      return [];
    }
}
