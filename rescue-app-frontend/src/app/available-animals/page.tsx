'use client';

import React, { useState, useEffect } from 'react';
import { Animal } from '@/types/animal';
import Image from 'next/image';
import Link from 'next/link';

async function fetchAvailableAnimals(filters: any, sortBy: string): Promise<Animal[]> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  try {
    const queryParams = new URLSearchParams({
      gender: filters.gender || '',
      ageGroup: filters.ageGroup || '',
      animalType: filters.animalType || '',
      breed: filters.breed || '',
      sortBy,
    });

    const response = await fetch(`${apiBaseUrl}/animals?${queryParams.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch animals');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching animals:', error);
    throw error;
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
  const [sortBy, setSortBy] = useState('longest'); // Default sorting

  useEffect(() => {
    const loadAnimals = async () => {
      setLoading(true);
      setError(null);

      try {
        const filters = {
          gender: genderFilter,
          ageGroup: ageGroupFilter,
          animalType: animalTypeFilter,
          breed: breedFilter,
        };
        const fetchedAnimals = await fetchAvailableAnimals(filters, sortBy);
        setAnimals(fetchedAnimals);
      } catch (err) {
        setError('Failed to load animals');
      } finally {
        setLoading(false);
      }
    };

    loadAnimals();
  }, [genderFilter, ageGroupFilter, animalTypeFilter, breedFilter, sortBy]);

  const handleGenderFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setGenderFilter(e.target.value);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Available Animals</h1>

      {/* Filtering Options */}
      <div className="flex flex-wrap items-center mb-4">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {animals.map((animal) => (
          <div key={animal.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <Link href={`/animal/${animal.id}`}>
              <div className="text-center">
                <h2 className="text-xl font-semibold py-2">{animal.name}</h2>
              </div>
              <Image
                src={animal.imageurl || '/placeholder-image.jpg'}
                alt={animal.name || 'Animal image'}
                width={400}
                height={300}
                className="w-full h-64 object-cover"
              />
            </Link>
            <div className="p-4">
              <p className="text-gray-700">{animal.breed}</p>
              {/* Add more animal details here */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}