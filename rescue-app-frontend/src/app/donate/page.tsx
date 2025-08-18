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
                    Every contribution directly supports our mission and helps save lives. Use the secure form below to make a one-time or recurring donation.
                </p>

                {/* Donorbox Embedded Form */}
                <div className="mb-8 flex justify-center">
                    <iframe
                        src="https://donorbox.org/second-chance-794835?default_interval=o&hide_donation_meter=true"
                        name="donorbox"
                        allow="payment"
                        seamless={true}
                        frameBorder="0"
                        scrolling="no"
                        height="900px"
                        width="100%"
                        style={{ maxWidth: '500px', minWidth: '250px', maxHeight: 'none' }}
                    ></iframe>
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
                            href="https://www.amazon.com/hz/wishlist/ls/197NWZ1O3D2O9?ref_=wl_share"
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
                                href="https://instagram.com/"
                                target="_blank"
                                rel="noopener">
                                <span className="sr-only">Instagram</span>
                                <Instagram />
                            </a>
                            <a
                                href="https://facebook.com/"
                                target="_blank"
                                rel="noopener">
                                <span className="sr-only">Facebook</span>
                                <Facebook />
                            </a>
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
