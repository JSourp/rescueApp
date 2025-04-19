// src/components/HeroSection.tsx
import React from 'react';
import { Container } from '@/components/Container';
import Link from 'next/link';

export const HeroSection = () => {
	const missionStatement = "Providing a second chance for animals in need through dedicated rescue, compassionate rehabilitation, and placement into loving forever homes, operating with full transparency and unwavering advocacy for animal well-being.";

	return (
		<div className="bg-gradient-to-r from-yellow-800 via-amber-800 to-orange-900 dark:from-yellow-900 dark:via-amber-900 dark:to-orange-950 text-white py-16 md:py-24">
			<Container>
				<div className="max-w-4xl mx-auto text-center">
					<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight text-white drop-shadow-md">
						Second Chance Animal Rescue & Sanctuary
					</h1>
					<p className="text-lg md:text-xl font-medium mb-8 text-gray-100 dark:text-gray-200 px-4 drop-shadow-sm">
						{missionStatement}
					</p>

					{/* Call-to-Action Buttons (Should still contrast well) */}
					<div className="flex flex-col sm:flex-row justify-center gap-4">
						<Link
							href="/available-animals"
							// Use a contrasting light color for the primary button
							className="inline-block bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold py-3 px-8 rounded-md transition duration-300 text-lg shadow-md"
						>
							Meet Our Animals
						</Link>
						<Link
							href="/get-involved"
							// Keep transparent border style
							className="inline-block bg-transparent hover:bg-white hover:bg-opacity-20 border-2 border-white text-white font-bold py-3 px-8 rounded-md transition duration-300 text-lg"
						>
							Get Involved
						</Link>
					</div>
				</div>
			</Container>
		</div>
	);
};
