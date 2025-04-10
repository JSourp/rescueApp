import React, { useEffect, useState } from "react";
import {
  ArrowRightCircleIcon,
  ArrowRightEndOnRectangleIcon,
  ArrowRightIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/solid";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

export const fetchSpotlights = async () => {
  try {
    const response = await fetch(`${apiBaseUrl}/animals`);
    if (!response.ok) {
      throw new Error("Failed to fetch spotlight data");
    }
    const data = await response.json();

    // Filter and sort the data to match the query
    const filteredData = data
      .filter((animal) =>
        ["With Foster", "Available"].includes(animal.adoptionstatus)
      )
      .sort((a, b) => a.id - b.id)
      .slice(0, 2); // Get the top two results

    // Map the filtered data to the required structure
    return filteredData.map((animal) => ({
      title: `Meet ${animal.name}`,
      desc: animal.story,
      image: animal.imageurl,
      bullets: [
        {
          title: "Age:",
          desc: calculateAge(animal.dateofbirth),
          icon: <ArrowRightCircleIcon />,
        },
        {
          title: "Gender:",
          desc: animal.gender,
          icon: <ArrowRightEndOnRectangleIcon />,
        },
        {
          title: "Breed:",
          desc: animal.breed,
          icon: <ArrowRightIcon />,
        },
        {
          title: "Adoption Status:",
          desc: animal.adoptionstatus,
          icon: <ArrowRightStartOnRectangleIcon />,
        },
      ],
    }));
  } catch (error) {
    console.error("Error fetching spotlight data:", error);
    return [];
  }
};

export const calculateAge = (dateOfBirth) => {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();

  // Adjust for negative months (when the current month is earlier than the birth month)
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  // Handle singular/plural and omit "0 years" or "0 months"
  const yearText = years > 0 ? `${years} ${years === 1 ? "year" : "years"}` : "";
  const monthText = months > 0 ? `${months} ${months === 1 ? "month" : "months"}` : "";

  // Combine year and month text, omitting "and" if one is empty
  return [yearText, monthText].filter(Boolean).join(" and ");
};

const SpotlightData = () => {
  const [spotlightOne, setSpotlightOne] = useState(null);
  const [spotlightTwo, setSpotlightTwo] = useState(null);

  useEffect(() => {
    const loadSpotlights = async () => {
      const spotlights = await fetchSpotlights();
      if (spotlights.length > 0) {
        setSpotlightOne(spotlights[0]);
      }
      if (spotlights.length > 1) {
        setSpotlightTwo(spotlights[1]);
      }
    };

    loadSpotlights();
  }, []);

  return { spotlightOne, spotlightTwo };
};

export default SpotlightData;