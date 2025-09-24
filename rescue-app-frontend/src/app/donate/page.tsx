import { Container } from "@/components/Container";
import Link from "next/link";
import { Facebook, Instagram } from "@/components/Icons";

export default function DonatePage() {
    return (
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
            <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-6 md:p-8 rounded-lg shadow-lg border border-gray-300 dark:border-transparent">
                <h2 className="text-2xl font-semibold mb-4 text-center text-heading">
                    Make a Secure Donation
                </h2>
                <p className="text-gray-700 dark:text-gray-300 mb-6 text-center">
                    Click the button below to make a secure one-time or recurring donation through our partnership with Donorbox. Every contribution directly supports our mission and helps save lives.
                </p>

                {/* Donorbox Link Button */}
                <div className="mt-6 mb-8 text-center">
                    <a
                        href="https://donorbox.org/second-chance-794835?"
                        className="dbox-donation-button inline-block px-8 py-3 rounded-md shadow-lg text-lg font-semibold text-text-on-accent bg-accent hover:scale-105 transition-transform duration-300"
                        style={{ textDecoration: 'none' }}
                    >
                        Donate Securely Now
                    </a>
                </div>

                <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200 border-t pt-6 border-gray-200 dark:border-gray-700">
                    Other Ways to Give
                </h3>
                <div className="space-y-5">
                    {/* Link to Get Involved */}
                    <div>
                        <strong className="font-medium text-gray-900 dark:text-gray-100">Volunteer or Foster:</strong>
                        <p className="text-gray-700 dark:text-gray-300 inline ml-1">
                            Your time and temporary home space are invaluable gifts.
                        </p>
                        <Link href="/get-involved" className="text-text-link hover:underline ml-2 font-medium whitespace-nowrap">
                            Learn More & Apply Here
                        </Link>
                    </div>

                    {/* Wishlist Option */}
                    <div>
                        <strong className="font-medium text-gray-900 dark:text-gray-100">Donate Supplies:</strong>
                        <p className="text-gray-700 dark:text-gray-300 inline ml-1">
                            Essential items help us care for the animals daily.
                        </p>
                        <a
                            href="https://a.co/9oxHMUy"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:underline ml-2 font-medium whitespace-nowrap">
                            View Our Wishlist
                        </a>
                    </div>

                    {/* Spread the Word */}
                    <div>
                        <strong className="font-medium text-gray-900 dark:text-gray-100">Spread the Word:</strong>
                        <p className="text-gray-700 dark:text-gray-300 inline ml-1">
                            Follow us on social media and share our animals&apos; stories! Every share increases their chance of finding a home.
                        </p>
                        <div className="mt-2 flex justify-start gap-4">
                            <a
                                href="https://www.instagram.com/scars.az/"
                                target="_blank"
                                rel="noopener">
                                <span className="sr-only">Instagram</span>
                                <Instagram />
                            </a>
                            {/* <a
                                href="https://facebook.com/"
                                target="_blank"
                                rel="noopener">
                                <span className="sr-only">Facebook</span>
                                <Facebook />
                            </a> */}
                        </div>
                    </div>
                </div>

                <p className="mt-10 text-center text-gray-600 dark:text-gray-400 italic">
                    Every contribution, big or small, makes a life-changing difference. Thank you for your support!
                </p>
            </div>
        </Container>
    );
}
