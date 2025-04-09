'use client';

import React, { useState, useEffect } from 'react';
import { Animal } from '@/types/animal';
import Image from 'next/image';
import Link from 'next/link';

async function fetchAnimalTypes(): Promise<string[]> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  try {
    const response = await fetch(`${apiBaseUrl}/animals/types`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching animal types:', error);
    return [];
  }
}

async function fetchAvailableAnimals(filters: {
  gender: string;
  animalType: string;
  breed: string;
}, sortBy: string): Promise<Animal[]> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  let url = `${apiBaseUrl}/animals?`;

  if (filters.gender) {
    url += `gender=${filters.gender}&`;
  }
  if (filters.animalType) {
    url += `animalType=${filters.animalType}&`;
  }
  if (filters.breed) {
    url += `breed=${filters.breed}&`;
  }
  if (sortBy) {
    url += `sortBy=${sortBy}&`;
  }

  // Remove the trailing '&' if it exists
  url = url.slice(0, -1);

  try {
    const response = await fetch(url, {
      cache: 'no-store',
    });

    if (!response.ok) {
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
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [genderFilter, setGenderFilter] = useState('');
  const [ageGroupFilter, setAgeGroupFilter] = useState('');
  const [animalTypeFilter, setAnimalTypeFilter] = useState('');
  const [breedFilter, setBreedFilter] = useState('');
  const [animalTypes, setAnimalTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('longest'); // Default sorting

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [fetchedAnimals, fetchedAnimalTypes] = await Promise.all([
          fetchAvailableAnimals({ gender: genderFilter, animalType: animalTypeFilter, breed: breedFilter }, sortBy),
          fetchAnimalTypes(),
        ]);

        setAnimals(fetchedAnimals);
        setAnimalTypes(fetchedAnimalTypes);

      } catch (err) {
        setError('Failed to load animals');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [genderFilter, ageGroupFilter, animalTypeFilter, breedFilter, sortBy]);

  const handleAnimalTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAnimalTypeFilter(e.target.value);
  };

  const handleGenderFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setGenderFilter(e.target.value);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
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
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Available Animals</h1>

      {/* Filtering Options */}
      <div className="flex flex-wrap items-center mb-4">
        <select value={animalTypeFilter} onChange={handleAnimalTypeFilterChange} className="mr-4">
          <option value="">All Types</option>
          {animalTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <select value={genderFilter} onChange={handleGenderFilterChange} className="mr-4">
          <option value="">All Genders</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
        {/* Add other filters here */}
        <select value={sortBy} onChange={handleSortChange}>
          <option value="longest">Longest Stay</option>
          <option value="shortest">Shortest Stay</option>
        </select>
      </div>

      {/* Animal Grid */}
        <div className="flex justify-center">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {animals.map((animal) => (
                <div
                    key={animal.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
                >
                    <Link href={`/animal/${animal.id}`}>
                    <div className="text-center">
                        <h2 className="text-xl font-semibold py-2 text-gray-900 dark:text-gray-100">
                        {animal.name}
                        </h2>
                    </div>
                    <Image
                        src={animal.imageurl || '/placeholder-image.jpg'}
                        alt={animal.name || 'Animal image'}
                        width={400}
                        height={300}
                        className="w-full h-64 object-cover"
                    />
                    </Link>
                    <div className="p-4 text-center">
                    {/* Add more animal details here */}
                    </div>
                </div>
                ))}
            </div>
        </div>
    </div>
  );
}