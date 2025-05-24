import { Container } from "@/components/Container";
import { SectionTitle } from "@/components/SectionTitle";
import Image from "next/image";
import Link from "next/link";

export default function AboutUsPage() {
  const boardMembers = [
    "Jordan Brunelle",
    "Kelsey Johnson",
    "Chris Robinson",
    "Emilie Robinson",
    "Chanell Sourp",
    "Jon Sourp",
  ];

  const ein = "33-5038937";

  // Dynamically calculate the number of board members
  const boardMemberCount = boardMembers.length;

  return (
    <Container className="py-12 md:py-16">
      <div className="max-w-5xl mx-auto bg-white dark:bg-gray-800 px-4 md:px-2 py-10 rounded-lg shadow-lg border border-gray-300 dark:border-transparent">      {/* Optional Hero Image */}
        {/* <div className="mb-12">
        <Image
          src="/images/about-us-hero.jpg" // Replace with a suitable image path
          alt="Second Chance Animal Rescue and Sanctuary team or animals"
          width={1200}
          height={400}
          className="w-full h-auto max-h-[400px] object-cover rounded-lg shadow-md"
        />
      </div> */}

        <div className="text-center mb-10">
          <SectionTitle
            preTitle="Our Story"
            title="Advocates First: Welcome to Second Chance">
            Located in Glendale, Arizona, Second Chance Animal Rescue and Sanctuary
            was founded by a group of passionate animal advocates dedicated to making
            a tangible difference in the lives of animals in need.
          </SectionTitle>
        </div>

        <div className="prose prose-lg dark:prose-invert max-w-4xl mx-auto text-gray-700 dark:text-gray-300 space-y-6">
          {/* Section: Our Why / Philosophy */}
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">Our Philosophy: Rescue and Sanctuary</h2>
          <p>
            We believe every animal deserves exactly that - a second chance. Our name reflects our core belief: we are both a rescue, focused on finding loving forever homes, and a sanctuary, providing a safe haven for animals who may need lifetime care.
            <Link href="/graduates" className="text-text-link hover:underline font-medium mx-1">
              See our success stories!
            </Link>
            We learned from volunteering elsewhere - adopting the best practices and vowing to avoid the pitfalls that can fail animals. Our commitment is to each individual animal, treating them as our own for as long as they need us.
          </p>
          <p>
            You might see how long an animal has been with us listed on their profile. This isn&apos;t an expiration date; it&apos;s simply information, much like their age or breed, that might resonate with a potential adopter. There is no &quot;too long&quot; at Second Chance.
          </p>

          {/* Section: Our Approach / Values */}
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">Our Approach: Transparency and Teamwork</h2>
          <p>
            We operate with the highest level of transparency and communication. As a non-profit organization, we believe our supporters deserve to know exactly how their contributions are used. We are committed to providing financial visibility that goes beyond the standard requirements, because trust is built on openness. You deserve to know what we truly stand for through our actions, not just our words.
          </p>
          <p>
            Every significant decision is made collectively by our board. We hold each other accountable, drawing on diverse experiences to ensure we always act in the best interest of the animals. We are human, and we strive to learn and improve continuously.
          </p>

          {/* Section: Euthanasia Stance */}
          <p>
            Our unwavering commitment is to provide life-saving care and a path to a brighter future. Difficult end-of-life decisions are considered only as an absolute final resort to prevent untreatable suffering, made with immense compassion and collective agreement by the full team, always prioritizing what is truly kindest for the individual animal.
          </p>

          {/* Section: Meet the Team */}
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">Our Team</h2>
          <p>
            Second Chance is guided by a dedicated board of {boardMemberCount} individuals. We come from varied backgrounds, united by years of hands-on animal welfare volunteering and a shared passion for creating a better future for animals in our community. We don&apos;t focus on titles; we focus on teamwork and leveraging our collective experience to serve the animals first.
          </p>
          {/* Simple List - Add more detail later if desired */}
          <ul className="list-disc list-inside">
            {boardMembers.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>

          {/* Section: Non-Profit Status */}
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">Our Commitment to You</h2>
          {/* "with 501(c)(3) status" once obtained */}
          <p>
            Second Chance Animal Rescue and Sanctuary is a registered non-profit organization [pending 501(c)(3) status]. Our Employer Identification Number (EIN) is: <strong>{ein}</strong>. We promise to be responsible stewards of your generous support and maintain open communication about our operations and finances.
          </p>

          {/* Call to Action */}
          <div className="text-center mt-10">
            <Link href="/get-involved" className="text-text-on-primary bg-primary hover:bg-primary-800 transition duration-300 rounded-md shadow py-3 px-6">
              Learn How You Can Help
            </Link>
          </div>
        </div>
      </div>
    </Container>
  );
}
