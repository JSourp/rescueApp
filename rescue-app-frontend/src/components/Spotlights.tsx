import Image from "next/image";
import React, { useState } from "react"; // Import useState
import { Container } from "@/components/Container";
import Modal from '@/components/Modal'; // Import Modal
import AdoptionForm from '@/components/AdoptionForm'; // Import AdoptionForm

// Update interface to include id and name
interface SpotlightData {
    id: number;
    name: string;
    title: string;
    desc: string | null;
    image: any; // Keep 'any' or use string | StaticImageData
    bullets: {
      title: string;
      desc: string | null;
      icon: React.ReactNode;
    }[];
    imgPos?: "left" | "right"; // Keep imgPos if needed for data structure
}

interface SpotlightsProps {
  imgPos?: "left" | "right"; // For layout control
  data: SpotlightData | null; // Accept potentially null data
}

export const Spotlights = (props: Readonly<SpotlightsProps>) => {
  const { data } = props;
  const [showAdoptForm, setShowAdoptForm] = useState(false); // State for modal

  // Handle case where data might be null (if API fetch fails or returns empty)
  if (!data) {
    // Optionally render a placeholder or nothing
    return null; // Or <Container>Loading Spotlight...</Container> etc.
  }

  // Determine image position for layout, fallback to left if not specified
  const imagePosition = props.imgPos || data.imgPos || "left";

  return (
    <> {/* Use Fragment to wrap component and modal */}
      <Container className="flex flex-wrap mb-20 lg:gap-10 lg:flex-nowrap ">
        {/* Image Section */}
        <div
          className={`flex items-center justify-center w-full lg:w-1/2 ${
            imagePosition === "right" ? "lg:order-1" : "" // Use layout variable
          }`}
        >
          <div>
            <Image
              // Check if data.image is already an object (like StaticImageData) or just a URL string
              src={typeof data.image === 'string' ? data.image : data.image.src}
              width={521} // Consider making responsive if needed
              height={521}
              alt={data.name || 'Spotlight Animal'} // Use actual name for alt text
              className={"object-cover rounded-lg shadow-md"} // Added rounded corners/shadow
              // Add blurDataURL only if data.image is StaticImageData or handle separately
              blurDataURL={typeof data.image !== 'string' ? data.image.blurDataURL : undefined}
              placeholder={typeof data.image !== 'string' ? "blur" : "empty"}
              priority // Prioritize loading spotlight images
            />
          </div>
        </div>

        {/* Text Content Section */}
        <div
          className={`flex flex-wrap items-center w-full lg:w-1/2 ${
            imagePosition === "right" ? "lg:justify-end lg:pl-10" : "lg:pr-10" // Adjusted padding
          }`}
        >
          <div>
            <div className="flex flex-col w-full mt-4">
              <h3 className="max-w-2xl mt-3 text-3xl font-bold leading-snug tracking-tight text-gray-800 lg:leading-tight lg:text-4xl dark:text-white">
                {data.title} {/* "Meet Sparky" */}
              </h3>

              <p className="max-w-2xl py-4 text-lg leading-normal text-gray-500 lg:text-xl xl:text-xl dark:text-gray-300">
                {data.desc} {/* Animal's story */}
              </p>
            </div>

            {/* Bullet Points */}
            <div className="w-full mt-5">
              {data.bullets.map((item, index) => (
                <Spotlight key={index} title={item.title} icon={item.icon}>
                  {item.desc}
                </Spotlight>
              ))}
            </div>

             <div className="w-full mt-8"> {/* Add margin top */}
                 <button
                     onClick={() => setShowAdoptForm(true)}
                     // Consistent styling (using Adoption Indigo theme)
                     className="bg-blue-500 hover:bg-blue-700 w-full sm:w-auto px-6 py-3 text-white font-bold rounded-md transition duration-300"
                 >
                     Apply to Adopt {data.name}
                 </button>
             </div>

          </div>
        </div>
      </Container>

       {showAdoptForm && (
         <Modal onClose={() => setShowAdoptForm(false)}>
           <AdoptionForm
             animalName={data.name} // Pass name from data prop
             animalId={data.id}   // Pass id from data prop
             onClose={() => setShowAdoptForm(false)}
           />
         </Modal>
       )}
    </>
  );
};


// Spotlight bullet item component
function Spotlight(props: any) {
  return (
    <div className="flex items-start mt-8 space-x-3">
      <div className="flex items-center justify-center flex-shrink-0 mt-1 bg-indigo-500 rounded-md w-11 h-11 ">
        {React.cloneElement(props.icon, {
          className: "w-7 h-7 text-indigo-50",
        })}
      </div>
      <div>
        <h4 className="text-xl font-medium text-gray-800 dark:text-gray-200">
          {props.title}
        </h4>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          {props.children}
        </p>
      </div>
    </div>
  );
}