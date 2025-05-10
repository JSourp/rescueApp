'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Animal } from '@/types/animal';
import Image from 'next/image';
import { calculateAge } from "@/components/data";
import Modal from '@/components/Modal';
import AdoptionForm from '@/components/AdoptionForm';
import { format, differenceInDays } from "date-fns";
import Slider from "react-slick";

async function fetchAnimalDetails(id: string): Promise<Animal | null> {
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
          const fetchedAnimal = await fetchAnimalDetails(animal_id);
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

  // --- Slider Settings ---
  const sliderSettings = {
    dots: true, // Show dot indicators
    infinite: true, // Loop slides
    speed: 500, // Transition speed
    slidesToShow: 1, // Show one image at a time
    slidesToScroll: 1,
    autoplay: true, // Auto-play slides
    autoplaySpeed: 5000, // Delay between slides (5 seconds)
    pauseOnHover: true,
    adaptiveHeight: true, // Adjust slider height to current image
    // Add custom arrows if desired
  };

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
  const intakeDate = format(new Date(animal.dateCreated), "MMM dd yyyy"); // Format as "Apr 09 2025"

  // Calculate the number of days the animal has been with you
  const daysWithUs = differenceInDays(new Date(), new Date(animal.dateCreated));

  // Determine the correct label for "day" or "days"
  const daysLabel = daysWithUs === 1 ? "day" : "days";

  // Safely extract images, default to empty array, filter out any potentially missing URLs
  const images = animal.animalImages?.filter(img => img.imageUrl) ?? [];

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-center text-4xl font-bold mb-6">{animal.name}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          {/* --- Image Carousel --- */}
          {images.length > 0 ? (
            <div className="mb-4 slick-container"> {/* Wrapper for potential custom arrow styling */}
              <Slider {...sliderSettings}>
                {images.map((image, index) => (
                  <div key={image.id || index}> {/* Use unique image ID */}
                    <div className="aspect-w-4 aspect-h-3 bg-gray-100 dark:bg-gray-700 rounded-lg"> {/* Aspect ratio container */}
                      <Image
                        src={image.imageUrl} // Use correct camelCase prop
                        alt={`${animal.name || 'Animal'} picture ${index + 1} ${image.caption ? `- ${image.caption}` : ''}`}
                        fill
                        className="object-cover rounded-lg"
                        priority={index === 0} // Prioritize first image
                        sizes="(max-width: 768px) 100vw, 50vw" // Example sizes attribute
                      />
                    </div>
                    {image.caption && <p className="text-center text-xs italic text-gray-500 mt-1">{image.caption}</p>}
                  </div>
                ))}
              </Slider>
            </div>
          ) : (
              // Fallback if animal.animalImages is empty or missing
              <div className="aspect-w-4 aspect-h-3 mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Image
                  src={'/placeholder-image.png'}
                  alt={animal.name || 'Animal image'}
                  fill // or width={450} height={450}
                  className="object-contain p-4" // Use contain for placeholder? Or cover?
                  priority
                />
            </div>
          )}
        </div>
        {/* --- Animal Details --- */}
        <div className="text-base">
          <p className="mb-4">{animal.story}</p>
          <p className="mb-2">Species: {animal.animalType}</p>
          <p className="mb-2">Breed: {animal.breed}</p>
          <p className="mb-2">Age: {calculateAge(animal.dateOfBirth)}</p>
          <p className="mb-2">Gender: {animal.gender}</p>
          <p className="mb-2">Weight: {animal.weight} lbs</p>
          <p className="mb-2">Intake date: {intakeDate}</p>
          <p className="mb-2">Time with us: {daysWithUs} {daysLabel}</p>
          <p className="mb-2">Adoption Status: {animal.adoptionStatus}</p>

          {/* View Apply to Adopt Button - Conditional */}
          {['Available', 'Available - In Foster', 'Adoption Pending'].includes(animal.adoptionStatus ?? '') && (
            <button
              className="bg-primary hover:bg-primary-800 w-full sm:w-auto text-white font-bold rounded-md transition duration-300 py-2 px-4 mt-4"
              onClick={() => setshowAdoptionForm(true)}>
              Apply to Adopt {animal.name}
            </button>
          )}
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
