import React, { useEffect, useState } from "react";
import {
  ArrowRightCircleIcon,
  ArrowRightEndOnRectangleIcon,
  ArrowRightIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/solid";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

// Keep calculateAge function as is (make sure it handles null dateOfBirth)
export const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) {
    return "Unknown";
  }
  try {
    const birthDate = new Date(dateOfBirth);
    // Add check for invalid date
    if (isNaN(birthDate.getTime())) {
        return "Unknown";
    }
    const today = new Date();

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();

    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
      years--;
      months = (months + 12) % 12; // Correct month calculation
    }

    const yearText = years > 0 ? `${years} ${years === 1 ? "year" : "years"}` : "";
    const monthText = months > 0 ? `${months} ${months === 1 ? "month" : "months"}` : "";

    if (!yearText && !monthText) return "Less than a month old"; // Handle very young age

    return [yearText, monthText].filter(Boolean).join(" and ");
  } catch (e) {
      console.error("Error calculating age for date:", dateOfBirth, e);
      return "Unknown";
  }
};


export const fetchSpotlights = async () => {
  try {
    // Consider adding the status filter directly to the API call if possible
    // ?adoption_status=Available,Available%20-%20In%20Foster&limit=2&sortBy=idAsc (or similar)
    // This avoids fetching ALL animals client-side
    const response = await fetch(`${apiBaseUrl}/animals`); // Fetches all animals currently
    if (!response.ok) {
      throw new Error("Failed to fetch spotlight data");
    }
    const data = await response.json();

    // Assuming API returns camelCase now due to backend serialization settings
    const filteredData = data
      .filter((animal) => // Use 'any' or define a proper type if available
        ["Available", "Available - In Foster"].includes(animal.adoptionStatus)
        // Note: Excluding "Adoption Pending" from spotlight usually makes sense
      )
      // Sort by ID ascending (adjust if different criteria needed)
      .sort((a, b) => a.id - b.id)
      .slice(0, 2); // Get the first two results

    // Map the filtered data, PRESERVING id and name
    return filteredData.map((animal) => ({
      id: animal.id,
      name: animal.name,
      title: `Meet ${animal.name}`, // Title for display
      desc: animal.story,          // Use story for description
      image: animal.imageUrl || '/placeholder-image.png', // provide fallback
      bullets: [
        {
          title: "Breed:",
          desc: animal.breed,
          icon: <ArrowRightIcon />,
        },
        {
          title: "Age:",
          desc: calculateAge(animal.dateOfBirth),
          icon: <ArrowRightIcon />,
        },
        {
          title: "Gender:",
          desc: animal.gender,
          icon: <ArrowRightIcon />,
        },
      ],
    }));
  } catch (error) {
    console.error("Error fetching spotlight data:", error);
    return []; // Return empty array on error
  }
};

const SpotlightData = () => {
  // Define a type for the state based on the mapped structure
  /**
   * @typedef {Object} SpotlightAnimal
   * @property {number} id
   * @property {string} name
   * @property {string} title
   * @property {string | null} desc
   * @property {string} image
   * @property {{ title: string; desc: string | null; icon: React.ReactNode }[]} bullets
   */

  const [spotlightOne, setSpotlightOne] = useState(null);
  const [spotlightTwo, setSpotlightTwo] = useState(null);

  useEffect(() => {
    const loadSpotlights = async () => {
      const spotlights = await fetchSpotlights();
      if (spotlights.length > 0) {
        setSpotlightOne(spotlights[0]);
      } else {
        setSpotlightOne(null); // Handle case where no spotlights are found
      }
      if (spotlights.length > 1) {
        setSpotlightTwo(spotlights[1]);
      } else {
        setSpotlightOne(null); // Handle case where only one is found
      }
    };

    loadSpotlights();
  }, []); // Empty dependency array ensures this runs only once on mount

  return { spotlightOne, spotlightTwo };
};

export default SpotlightData; // Export the hook for use in components