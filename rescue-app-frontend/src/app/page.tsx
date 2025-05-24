'use client';

import { useEffect, useState } from "react";
import { Container } from "@/components/Container";
import { Partners } from "@/components/Partners";
import { SectionTitle } from "@/components/SectionTitle";
import { HeroSection } from "@/components/HeroSection";
import { Spotlights } from "@/components/Spotlights";
import { fetchSpotlights } from "@/components/data";
//import { Video } from "@/components/Video";
import { Testimonials } from "@/components/Testimonials";
import { Faq } from "@/components/Faq";
import { Donate } from "@/components/Donate";

// Define the type for the spotlight data structure (matching what fetchSpotlights returns)
type SpotlightAnimalData = {
  id: number;
  name: string;
  title: string;
  desc: string | null;
  image: any; // string | StaticImageData
  bullets: {
    title: string;
    desc: string | null;
    icon: React.ReactNode;
  }[];
} | null; // Allow null

export default function Home() {
  // Use the specific type for state, initialized to null
  const [spotlightOne, setSpotlightOne] = useState<SpotlightAnimalData>(null);
  const [spotlightTwo, setSpotlightTwo] = useState<SpotlightAnimalData>(null);
  // Add a dedicated loading state
  const [loadingSpotlights, setLoadingSpotlights] = useState<boolean>(true);
  const [errorSpotlights, setErrorSpotlights] = useState<string | null>(null);


  useEffect(() => {
    const loadSpotlights = async () => {
      setLoadingSpotlights(true);
      setErrorSpotlights(null);
      try {
        const spotlights = await fetchSpotlights();

        // Set state based on the number of results, handle null/undefined
        setSpotlightOne(spotlights.length > 0 ? spotlights[0] : null);
        setSpotlightTwo(spotlights.length > 1 ? spotlights[1] : null);

      } catch (error) {
        console.error("Failed to load spotlight data:", error);
        setErrorSpotlights("Could not load spotlight animals.");
        setSpotlightOne(null); // Clear state on error
        setSpotlightTwo(null);
      } finally {
        setLoadingSpotlights(false); // Finish loading regardless of success/error
      }
    };

    loadSpotlights();
  }, []); // Empty dependency array, runs once on mount

  return (
    // Use a Fragment <> </> to avoid unnecessary divs if needed
    <>
      <HeroSection />

      <Container>
        {/* Conditionally render Spotlights based on loading and data */}
        {loadingSpotlights && (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            Loading something adorable...
          </div>
        )}
        {errorSpotlights && (
          <div className="text-center py-10 text-red-500 dark:text-red-400">
            Error: {errorSpotlights}
          </div>
        )}

        {/* Render spotlights only if data is available and no loading/error */}
        {!loadingSpotlights && !errorSpotlights && spotlightOne && (
          <>
            {/* Render first spotlight (already checked it exists) */}
            <Spotlights data={spotlightOne} imgPos="left" />

            {/* Render second spotlight only if it also exists */}
            {spotlightTwo && (
              <Spotlights data={spotlightTwo} imgPos="right" />
            )}
          </>
        )}


        {/* Removing Video section for now
         <SectionTitle
           title="A Day in the Life at Second Chance"
         >
           Join us for a behind-the-scenes look at the dedication and care that goes into helping animals every day.
         </SectionTitle>
         <Video videoId="fZ0D0cnR88E" />
         */}

        <SectionTitle
          preTitle="Testimonials"
          title="What Our Community Says">
          We are so grateful for the support of our community.
          These testimonials highlight the positive impact of Second Chance on both animals and humans.
        </SectionTitle>
        <Testimonials />

        <Donate />

        <SectionTitle preTitle="FAQ" title="Frequently Asked Questions">
          Have questions? We&apos;ve got answers!
        </SectionTitle>
        <Faq />

        <Partners />
      </Container>
    </>
  );
}
