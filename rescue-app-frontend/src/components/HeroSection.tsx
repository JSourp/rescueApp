// src/components/HeroSection.tsx
import React, { useState, useEffect } from 'react';
import { Container } from '@/components/Container';
import Link from 'next/link';

export const HeroSection = () => {
	const missionStatement = "Providing a second chance for animals in need through dedicated rescue, compassionate rehabilitation, and placement into loving forever homes, operating with full transparency and unwavering advocacy for animal well-being.";

	return (
		<div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 p-8 md:p-4 rounded-lg shadow-lg border border-gray-300 dark:border-transparent">
			<Container>
				<div className="max-w-5xl mx-auto text-center">
					<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight drop-shadow-md text-base lg:leading-tight lg:text-4xl">
						Second Chance Animal Rescue & Sanctuary
					</h1>
					<p className="text-lg md:text-xl font-medium mb-8 px-4 drop-shadow-sm text-gray-500 lg:text-xl xl:text-xl dark:text-gray-300">
						{missionStatement}
					</p>

					{/* Call-to-Action Buttons (Should still contrast well) */}
					<div className="flex flex-col sm:flex-row justify-center gap-4">
						<Link
							href="/available-animals"
							// Use a contrasting light color for the primary button
							className="inline-block bg-primary hover:bg-primary-800 text-on-primary font-bold py-3 px-8 rounded-md transition duration-300 text-lg shadow-md"
						>
							Meet Our Animals
						</Link>
						<Link
							href="/get-involved"
							// Keep transparent border style
							className="inline-block bg-transparent hover:bg-secondary-600 hover:bg-opacity-20 border-black dark:hover:bg-white dark:hover:text-black dark:border-white border-2 font-bold py-3 px-8 rounded-md transition duration-300 text-lg"
						>
							Get Involved
						</Link>
					</div>
				</div>
			</Container>
		</div>
	);
};
