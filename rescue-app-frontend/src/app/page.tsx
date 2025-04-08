import { Container } from "@/components/Container";
import { Partners } from "@/components/Partners";
import { SectionTitle } from "@/components/SectionTitle";
import { Spotlights } from "@/components/Spotlights";
//import { Video } from "@/components/Video";
import { Testimonials } from "@/components/Testimonials";
import { Faq } from "@/components/Faq";
import { Donate } from "@/components/Donate";

import { spotlightOne, spotlightTwo } from "@/components/data";
export default function Home() {
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
        Have questions? We've got answers!
      </SectionTitle>
      <Faq />

      <Partners />
    </Container>
  );
}
