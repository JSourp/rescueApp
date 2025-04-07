'use client';

import React, { useEffect, useState } from 'react';
import { Animal } from '@/types/animal';

export default function AvailableAnimalsPage() {
    const [animals, setAnimals] = useState<Animal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    useEffect(() => {
        const fetchAnimals = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`${apiBaseUrl}/animals`, { method: 'GET', cache: 'no-store' });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data: Animal[] = await response.json();
                setAnimals(data);
            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError('An unknown error occurred.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchAnimals();
    }, []);

    if (loading) {
        return <div>Loading available animals...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div>
            <h1>Available Animals</h1>
            {animals.length === 0 ? (
                <p>No animals currently available.</p>
            ) : (
                <ul>
                    {animals.map((animal) => (
                        <li key={animal.id}>
                            <strong>{animal.name}</strong> ({animal.animaltype}) - {animal.breed}
                            <p>{animal.story}</p>
                            <img src={animal.imageurl} alt={animal.name} style={{ maxWidth: '200px' }} />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}