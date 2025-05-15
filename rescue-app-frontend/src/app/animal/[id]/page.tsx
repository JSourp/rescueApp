'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Animal } from '@/types/animal';
import Image from 'next/image';
import Link from 'next/link';
import { calculateAge } from "@/components/data";
import Modal from '@/components/Modal';
import AdoptionForm from '@/components/AdoptionForm';
import { Container } from '@/components/Container';
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
    return (
      <Container className="py-10 text-center">
        <h1 className="text-2xl font-bold text-red-600">Animal Not Found</h1>
        <Link href="/available-animals" className="mt-6 inline-block text-text-link hover:underline">Back to Available Animals</Link>
      </Container>
    );
  }

  // Format the intake date
  const intakeDate = format(new Date(animal.dateCreated), "MMM dd yyyy"); // Format as "Apr 09 2025"

  // Calculate the number of days the animal has been with you
  const daysWithUs = differenceInDays(new Date(), new Date(animal.dateCreated));

  // Determine the correct label for "day" or "days"
  const daysLabel = daysWithUs === 1 ? "day" : "days";

  // Safely extract images, default to empty array, filter out any potentially missing URLs and sort them
  const images = animal.animalImages
    ?.filter(img => img.imageUrl) // filter for valid URLs
    .sort((a, b) => {
      // If a is primary and b is not, a comes first (-1)
      if (a.isPrimary && !b.isPrimary) {
        return -1;
      }
      // If b is primary and a is not, b comes first (1)
      if (!a.isPrimary && b.isPrimary) {
        return 1;
      }
      // If both are primary or both are not primary,
      // maintain their existing relative order (from backend's display_order/id sort)
      return (a.displayOrder ?? 99) - (b.displayOrder ?? 99);
    }) ?? []; // Default to empty array if animalImages is null/undefined

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-center text-4xl font-bold mb-6">{animal.name}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          {/* --- Image Display Logic with 0, 1, or >1 Image Cases --- */}
          {images.length === 0 ? (
            // --- Case 1: No Images ---
            <div className="aspect-video mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-md">
              <Image
                src={'/placeholder-image.png'}
                alt={animal.name || 'Animal image'}
                width={300} // Example intrinsic size for placeholder
                height={225}
                className="object-contain p-4 max-h-[400px]" // Contain placeholder
                priority
              />
            </div>
          ) : images.length === 1 ? (
            // --- Case 2: Exactly One Image ---
            <div className="relative w-full aspect-w-1 aspect-h-1 lg:aspect-w-16 lg:aspect-h-9">
              <Image
                src={images[0].imageUrl || '/placeholder-image.png'} // Access the first (and only) image's URL
                alt={`${animal.name || 'Animal'} picture ${images[0].caption ? `- ${images[0].caption}` : ''}`}
                  fill
                className="object-cover rounded-lg shadow-md"
                priority // First and only image, so prioritize
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 40vw, 30vw" // Match sizes from slider
              />
              {/* Optional: Display caption for single image, styled consistently
              {images[0].caption && (
                <p className="absolute bottom-0 left-0 right-0 p-2 bg-black bg-opacity-50 text-white text-xs text-center rounded-b-lg">
                  {images[0].caption}
                </p>
              )} */}
            </div>
          ) : (
            // --- Case 3: Multiple Images -> Show Slider ---
            <div className="mb-4 slick-container">
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
