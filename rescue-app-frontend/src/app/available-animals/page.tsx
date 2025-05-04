'use client';

import React, { useState, useEffect } from 'react';
import { Container } from '@/components/Container';
import { Animal } from '@/types/animal'; // Assuming you have this type definition
import Image from 'next/image';
import Link from 'next/link';
import { InformationCircleIcon } from "@/components/Icons";

async function fetchAnimalTypes(): Promise<string[]> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  try {
    const response = await fetch(`${apiBaseUrl}/animals/types`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data as string[];
  } catch (error) {
    console.error('Error fetching animal types:', error);
    return [];
  }
}

async function fetchAvailableAnimals(filters: {
  gender: string;
  animal_type: string;
  breed: string;
}, sortBy: string): Promise<Animal[]> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  // Define the statuses considered "available" for this public page
  const availableStatuses = [
    'Available',
    'Adoption Pending',
    'Available - In Foster'
  ];

  // Join the raw status strings with a comma
  const rawStatusQueryValue = availableStatuses.join(',');

  // Build the query parameters
  const queryParams = new URLSearchParams();

  // Append the RAW comma-separated string.
  queryParams.append('adoption_status', rawStatusQueryValue);

  // Add user-selectable filters
  function appendQueryParam(queryParams: URLSearchParams, key: string, value: string) {
    if (value) {
      queryParams.append(key, value);
    }
  }
  appendQueryParam(queryParams, 'gender', filters.gender);
  appendQueryParam(queryParams, 'animal_type', filters.animal_type);
  appendQueryParam(queryParams, 'breed', filters.breed);
  appendQueryParam(queryParams, 'sortBy', sortBy);

  const url = `${apiBaseUrl}/animals?${queryParams.toString()}`;

  if (process.env.NODE_ENV !== 'production') {
    console.log("Fetching animals from URL:", url);
  }

  try {
    const response = await fetch(url, {
      cache: 'no-store',
    });

    if (!response.ok) {
      // Log the response body for more details on error
      const errorBody = await response.text();
      console.error('API Error Response Body:', errorBody);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data as Animal[];
  } catch (error) {
    console.error('Error fetching available animals:', error);
    return [];
  }
}


export default function AvailableAnimalsPage() {
  const [animals, setAnimals] = useState<Animal[]>([]); // Array of Animal objects
  const [loading, setLoading] = useState<boolean>(true); // Boolean for loading state
  const [error, setError] = useState<string | null>(null); // Error message or null
  const [genderFilter, setGenderFilter] = useState<string>(''); // String for gender filter
  const [animalTypes, setAnimalTypes] = useState<string[]>([]); // Array of animal types
  const [ageGroupFilter, setAgeGroupFilter] = useState('');
  const [animalTypeFilter, setAnimalTypeFilter] = useState('');
  const [breedFilter, setBreedFilter] = useState('');
  const [sortBy, setSortBy] = useState('longest'); // Default sorting

  // Define the sort options
  const sortingOptions = [
    { value: 'longest', label: 'Longest Stay' },
    { value: 'shortest', label: 'Shortest Stay' },
    // Add other sort options like 'nameAsc', 'nameDesc', 'ageAsc', 'ageDesc' if backend supports
  ];

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Pass the breedFilter state to the fetch function
        const [fetchedAnimals, fetchedAnimalTypes] = await Promise.all([
          fetchAvailableAnimals({ gender: genderFilter, animal_type: animalTypeFilter, breed: breedFilter }, sortBy),
          fetchAnimalTypes(),
        ]);

        setAnimals(fetchedAnimals);
        setAnimalTypes(fetchedAnimalTypes);

      } catch (err) {
        // Log the actual error for more details
        console.error("Error during data loading:", err);
        setError(err instanceof Error ? err.message : 'Failed to load animals');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [genderFilter, animalTypeFilter, breedFilter, sortBy]);

  const handleAnimalTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAnimalTypeFilter(e.target.value);
  };

  const handleGenderFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setGenderFilter(e.target.value);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
  };

  // --- JSX (UI Code) ---
  // Add UI elements (like <input> or <select>) so user can actively filter by Breed or Age Group

  if (loading) {
    return (
      <div className="text-center py-10 text-gray-500 dark:text-gray-400">
        Loading something adorable...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        Error: {error}
      </div>
    );
  }

  return (
    <Container className="py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">Available Animals</h1>

      {/* Filtering Options */}
      <div className="flex flex-wrap items-center justify-center mb-6 gap-4">
        <select value={animalTypeFilter} onChange={handleAnimalTypeFilterChange} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600" aria-label="Filter by Animal Type">
          <option value="">All Species</option>
          {animalTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <select value={genderFilter} onChange={handleGenderFilterChange} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600" aria-label="Filter by Animal Genders">
          <option value="">All Genders</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          {/* Add 'Unknown' or other genders if applicable */}
        </select>
        <select value={sortBy} onChange={handleSortChange} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
          {sortingOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {/* Animal Grid */}
      {!loading && !error && ( // Only render grid section when not loading and no error
        <div className="flex justify-center">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {animals.length > 0 ? (
              animals.map((animal) => (
                <div
                  key={animal.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transform transition duration-300 hover:scale-105 border border-gray-300 dark:border-transparent" // Added hover effect
                >
                  <Link href={`/animal/${animal.id}`} className="block"> {/* Make entire card clickable */}
                    <div className="text-center">
                      <h2 className="text-xl font-semibold py-2 text-gray-900 dark:text-gray-100 truncate px-2"> {/* Added truncate */}
                        {animal.name}
                      </h2>
                    </div>
                    <Image
                      src={animal.image_url || '/placeholder-image.png'}
                      alt={animal.name ? `${animal.name}` : ''}
                      width={400}
                      height={300}
                      className="w-full h-64 object-cover" // Ensure consistent image size
                      priority={animals.indexOf(animal) < 4} // Prioritize loading images for first few animals
                    />
                    <div className="p-4 text-center">
                      <p className="text-sm text-stone-950 dark:text-stone-200">{animal.breed} ({animal.animal_type})</p>
                      <p className="text-sm text-stone-950 dark:text-stone-200">{animal.gender}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-1">{animal.adoption_status}</p>
                    </div>
                  </Link>
                </div>
              ))
            ) : (
                <div className="col-span-full text-center py-10 px-4">
                  <InformationCircleIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No Animals Match Your Search</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    We don&lsquo;t have any animals matching your current filters right now, but new friends arrive often! Please check back soon or adjust your filters.
                  </p>
                  <button
                    onClick={() => {
                      setGenderFilter('');
                      setAnimalTypeFilter('');
                      setBreedFilter('');
                      setSortBy('longest'); // Reset to default sort
                    }}
                    className="mt-4 px-4 py-2 text-sm font-medium text-text-link dark:text-text-link hover:underline focus:outline-none"
                  >
                    Reset Filters
                  </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Container>
  );
}
