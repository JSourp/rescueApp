'use client'; // For using useParams

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Animal } from '@/types/animal'; // Adjust import path
import Image from 'next/image';
import { calculateAge } from "@/components/data";
import { PopupWidget }  from "@/components/PopupWidget";
import Modal from '@/components/Modal';
import AdoptionForm from '@/components/AdoptionForm';
import { format, differenceInDays } from "date-fns";

async function fetchAnimal(id: string): Promise<Animal | null> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL; // Adjust URL if needed

  try {
    const response = await fetch(`${apiBaseUrl}/animals/${id}`, { // Use the id in the URL
      cache: 'no-store', // Disable caching for fresh data
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
  const params = useParams(); // Access the params from the URL
  const id = params?.id; // Safely extract 'id' if params is not null
  const animal_id = Array.isArray(id) ? id[0] : id; // Ensure id is a string
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdoptionForm, setshowAdoptionForm] = useState(false);

  useEffect(() => {
    const loadAnimal = async () => {
      setLoading(true);
      setError(null);

      try {
        if (animal_id) {
          const fetchedAnimal = await fetchAnimal(animal_id);
          setAnimal(fetchedAnimal);
        } else {
          setError('Animal ID is missing.');
        }
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
  }, [animal_id]); // Re-fetch data if the animal_id changes

  if (loading) {
    return (
      <div className="text-center py-10 text-gray-500 dark:text-gray-400">
        Loading something adorable...
      </div>
    );
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!animal) {
    return <div>Animal not found.</div>; // Handle the case where the animal is not found
  }

  // Format the intake date
  const intakeDate = format(new Date(animal.date_created), "MMM dd yyyy"); // Format as "Apr 09 2025"

  // Calculate the number of days the animal has been with you
  const daysWithUs = differenceInDays(new Date(), new Date(animal.date_created));

  // Determine the correct label for "day" or "days"
  const daysLabel = daysWithUs === 1 ? "day" : "days";

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-6">{animal.name}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <Image
            src={animal.image_url || '/placeholder-image.png'}
            alt={animal.name || 'Animal image'}
            width={600}
            height={450}
            className="w-full h-auto rounded-lg object-cover"
            priority // Prioritize image on details page
          />
        </div>
        <div>
          <p className="text-gray-700 mb-4">{animal.story}</p>
          <p className="text-gray-700 mb-2">Species: {animal.animal_type}</p>
          <p className="text-gray-700 mb-2">Breed: {animal.breed}</p>
          <p className="text-gray-700 mb-2">Age: {calculateAge(animal.date_of_birth)}</p>
          <p className="text-gray-700 mb-2">Gender: {animal.gender}</p>
          <p className="text-gray-700 mb-2">Weight: {animal.weight} lbs</p>
          {/*<p className="text-gray-700 mb-2">Intake date: {intakeDate}</p>*/}
          <p className="text-gray-700 mb-2">Time with us: {daysWithUs} {daysLabel}</p>
          <p className="text-gray-700 mb-2">Adoption Status: {animal.adoption_status}</p>
          <button
             className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4"
             onClick={() => setshowAdoptionForm(true)}
           >
             Apply to Adopt {animal.name}
          </button>
        </div>
      </div>

      {/* Conditionally render the Modal containing the Inquiry Form */}
      {showAdoptionForm && animal && ( // Rename state if desired, e.g., showAdoptionForm
          <Modal onClose={() => setshowAdoptionForm(false)}>
            <AdoptionForm
              animalName={animal.name ?? undefined} // Pass optional props
            animal_id={animal.id}                  // Pass optional props
              onClose={() => setshowAdoptionForm(false)}
            />
          </Modal>
      )}

    </div>
  );
}
