'use client';

import { useEffect, useState } from "react";
import { Container } from "@/components/Container";
import { Partners } from "@/components/Partners";
import { SectionTitle } from "@/components/SectionTitle";
import { Spotlights } from "@/components/Spotlights";
import { fetchSpotlights } from "@/components/data";
//import { Video } from "@/components/Video";
import { Testimonials } from "@/components/Testimonials";
import { Faq } from "@/components/Faq";
import { Donate } from "@/components/Donate";

export default function Home() {
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

  if (!spotlightOne || !spotlightTwo) {
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
    ); // Show a loading state while data is being fetched
  }

  return (
    <Container>
      <Spotlights data={spotlightOne} />
      <Spotlights imgPos="right" data={spotlightTwo} />

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
        title="What Our Community Says"
      >
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
  );
}
