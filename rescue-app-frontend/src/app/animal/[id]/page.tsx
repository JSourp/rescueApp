'use client'; // For using useParams

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Animal } from '@/types/animal'; // Adjust import path
import Image from 'next/image';
import { calculateAge } from "@/components/data";
import { PopupWidget }  from "@/components/PopupWidget";
import Modal from '@/components/Modal';
import AnimalInquiryForm from '@/components/AnimalInquiryForm';

async function fetchAnimal(id: string): Promise<Animal | null> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL; // Adjust URL if needed

  try {
    const response = await fetch(`${apiBaseUrl}/animals/${id}`, { // Use the id in the URL
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data as Animal;
  } catch (error) {
    console.error('Error fetching animal details:', error);
    return null;
  }
}

export default function AnimalDetailsPage() {
  const { id } = useParams(); // Access the 'id' from the URL
  const animalId = Array.isArray(id) ? id[0] : id; // Ensure id is a string
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInquiryForm, setShowInquiryForm] = useState(false);

  useEffect(() => {
    const loadAnimal = async () => {
      setLoading(true);
      setError(null);

      try {
        const fetchedAnimal = await fetchAnimal(animalId);
        setAnimal(fetchedAnimal);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred.');
        }
      } finally {
        setLoading(false);
      }
    }

    loadAnimal();
  }, [animalId]); // Re-fetch data if the animalId changes

  if (loading) {
    return <div>Loading animal details...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!animal) {
    return <div>Animal not found.</div>; // Handle the case where the animal is not found
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-6">{animal.name}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <Image
            src={animal.image_url || '/placeholder-image.jpg'}
            alt={animal.name || 'Animal image'}
            width={600}
            height={450}
            className="w-full h-auto rounded-lg object-cover"
            priority // Prioritize image on details page
          />
        </div>
        <div>
          <p className="text-gray-700 mb-4">{animal.story}</p>
          <p className="text-gray-700 mb-2">Breed: {animal.breed}</p>
          <p className="text-gray-700 mb-2">Age: {calculateAge(animal.date_of_birth)}</p>
          <p className="text-gray-700 mb-2">Gender: {animal.gender}</p>
          <p className="text-gray-700 mb-2">Adoption Status: {animal.adoption_status}</p>
          {/* Add more details as needed */}
          <button
             className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4"
             onClick={() => setShowInquiryForm(true)}
           >
             Contact Us About {animal.name}
          </button>
        </div>
      </div>

      {/* Conditionally render the Modal containing the Inquiry Form */}
      {showInquiryForm && (
        <Modal onClose={() => setShowInquiryForm(false)}> {/* Pass close handler */}
          <AnimalInquiryForm
             animalName={animal.name ?? 'this animal'} // Handle potential null name
             animalId={animal.id}
             onClose={() => setShowInquiryForm(false)} // Pass close handler down
           />
        </Modal>
      )}

    </div>
  );
}