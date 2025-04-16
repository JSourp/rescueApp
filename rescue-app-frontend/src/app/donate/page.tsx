import { Container } from "@/components/Container"; // Assuming path is correct
import Link from "next/link"; // For internal links

export default function DonatePage() {
  return (
    // Use Container for consistent padding and centering
    <Container className="py-12 md:py-16">
      <div className="max-w-3xl mx-auto text-center mb-10">
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          Support Our Second Chances
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Your generosity fuels our ability to provide essential food, shelter,
          medical care, and boundless love to animals awaiting their bright future.
        </p>
      </div>

      {/* Main content box */}
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-6 md:p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold mb-4 text-center text-indigo-600 dark:text-indigo-400">
          Online Donations - Coming Soon!
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-6 text-center">
                  We&apos;re incredibly grateful for your interest in supporting us financially! We are currently in the process of finalizing our official non-profit status and obtaining our EIN (Employer Identification Number).
        </p>
        {/* Highlight Box for Status */}
        <div className="mb-8 p-4 bg-indigo-50 dark:bg-gray-700 border-l-4 border-indigo-500 dark:border-indigo-400 rounded-r-md">
             <p className="text-indigo-800 dark:text-indigo-200 font-medium">
                      Once our EIN is confirmed, we&apos;ll be launching our secure online donation portal through Donorbox. Thank you for your patience!
            </p>
         </div>

        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200 border-t pt-6 border-gray-200 dark:border-gray-700">
          How You Can Help Right Now:
        </h3>
        <div className="space-y-5">
          {/* Link to Get Involved */}
          <div>
            <strong className="font-medium text-gray-900 dark:text-gray-100">Volunteer or Foster:</strong>
            <p className="text-gray-700 dark:text-gray-300 inline ml-1">
               Your time and temporary home space are invaluable gifts.
            </p>
            <Link href="/get-involved" className="text-indigo-600 dark:text-indigo-400 hover:underline ml-2 font-medium whitespace-nowrap">
              Learn More & Apply Here
            </Link>
          </div>

          {/* Wishlist Option */}
           <div>
             <strong className="font-medium text-gray-900 dark:text-gray-100">Donate Supplies:</strong>
             <p className="text-gray-700 dark:text-gray-300 inline ml-1">
                 Essential items help us care for the animals daily. [Optional: Describe how to find wishlist or contact info]
             </p>
             {/* Example Link structure - uncomment and add URL when ready */}
             {/*
             <a
                href="YOUR_WISHLIST_URL"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 dark:text-indigo-400 hover:underline ml-2 font-medium whitespace-nowrap"
             >
                 View Our Wishlist
             </a>
             */}
             {/* Or provide contact info */}
              <span className="block text-sm text-gray-500 dark:text-gray-400 mt-1">
                 (Please contact us for information on current needs and drop-off arrangements.)
              </span>
           </div>

          {/* Spread the Word */}
           <div>
              <strong className="font-medium text-gray-900 dark:text-gray-100">Spread the Word:</strong>
              <p className="text-gray-700 dark:text-gray-300 inline ml-1">
                          Follow us on social media and share our animals&apos; stories! Every share increases their chance of finding a home.
              </p>
             {/* Add social media links here if desired */}
             {/*
             <div className="mt-2 flex justify-start gap-4">
                 <a href="..." target="_blank" rel="noopener noreferrer" className="...">Facebook</a>
                 <a href="..." target="_blank" rel="noopener noreferrer" className="...">Instagram</a>
             </div>
             */}
           </div>
        </div>

        <p className="mt-10 text-center text-gray-600 dark:text-gray-400 italic">
                  Thank you for your understanding and support as we get established. We couldn&apos;t do this without you!
        </p>
      </div>
    </Container>
  );
}
