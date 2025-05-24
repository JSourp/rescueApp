// Temporary page for visualizing the custom Tailwind color palette
'use client';

import React, { useState, useEffect } from 'react';
import { Container } from '@/components/Container';
import { Disclosure, DisclosureButton, DisclosurePanel, Transition } from '@headlessui/react';
import { ChevronUpIcon } from '@heroicons/react/20/solid';

// Manually define the color palette structure based on tailwind.config.ts
const colorPalette = {
	'sc-sandal': { // Light Brownish Yellow, pulled from logo
		'50': '#f6f5f0', '100': '#e9e3d8', '200': '#d5c9b3', '300': '#bca788',
		'400': '#a68863', '500': '#997a59', '600': '#83634b', '700': '#6a4d3e',
		'800': '#5a4239', '900': '#4f3a34', '950': '#2d1f1b',
	},
	'sc-asparagus': { // Light Olive Green
		'50': '#f2f7ee', '100': '#e3ecdb', '200': '#cadbbb', '300': '#a9c492',
		'400': '#80a663', '500': '#6c9151', '600': '#53723e', '700': '#415932',
		'800': '#37482c', '900': '#303f28', '950': '#172112',
	},
	'sc-gothic': { // Dark Grayish Blue
		'50': '#f2f7f9', '100': '#dfeaee', '200': '#c3d7de', '300': '#99b9c7',
		'400': '#6390a6', '500': '#4c778e', '600': '#426378', '700': '#3a5364',
		'800': '#364754', '900': '#303d49', '950': '#1c2630',
	},
	'sc-trendy-pink': { // Purplish Pink
		'50': '#fbf7fc', '100': '#f6eff8', '200': '#eedef0', '300': '#e1c4e3',
		'400': '#cea0d2', '500': '#b679bc', '600': '#a263a6', '700': '#804982',
		'800': '#6a3d6b', '900': '#593659', '950': '#381a38',
	},
	'sc-fuscous-gray': { // Dark Brownish Gray
		'50': '#f4f4f2', '100': '#e3e3de', '200': '#c9c8bf', '300': '#aaa89a',
		'400': '#928e7d', '500': '#837e6f', '600': '#706a5e', '700': '#5b554d',
		'800': '#514c46', '900': '#46413d', '950': '#272421',
	},
	'sc-pumpkin': { // From sunset, Oranges/Terracottas
		'50': '#fff4ed', '100': '#ffe6d5', '200': '#feccaa', '300': '#fdac74',
		'400': '#fb8a3c', '500': '#f97316', '600': '#ea670c', '700': '#c2570c',
		'800': '#9a4a12', '900': '#7c3d12', '950': '#432007',
	},
	'sc-chateau-green': { // From forest, Greens
		'50': '#f0fdf5', '100': '#dcfce8', '200': '#bbf7d1', '300': '#86efad',
		'400': '#4ade81', '500': '#22c55e', '600': '#16a34a', '700': '#15803c',
		'800': '#166533', '900': '#14532b', '950': '#052e14',
	},
	'sc-scooter': { // From ocean, Blues/Teals
		'50': '#ecfcff', '100': '#cff7fe', '200': '#a5effc', '300': '#67e4f9',
		'400': '#22d0ee', '500': '#06b6d4', '600': '#0899b2', '700': '#0e7d90',
		'800': '#156775', '900': '#165863', '950': '#083b44',
	}
};

// Helper to get contrasting text color
const getTextColorForBg = (shade: number): string => {
	return shade <= 400 ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-100 dark:text-neutral-100';
};

// Helper to get a darker shade for hover background, capping at 950
const getHoverBgShade = (shade: number): number => {
	if (shade <= 800) return shade + 100;
	return 950;
}

// Helper to get a darker shade for hover border, capping at 950
const getBorderShade = (shade: number): number => {
	// Using +200 for a more noticeable border difference
	if (shade <= 700) return shade + 200;
	if (shade === 800) return 950;
	if (shade === 900) return 950;
	return shade; // Fallback for 950
}


export default function ColorPaletteDevPage() {
	const colorEntries = Object.entries(colorPalette);

	return (
		<Container className="py-10 px-4 md:px-0"> {/* Added padding for smaller screens */}
			<h1 className="text-3xl font-bold mb-8 text-center text-gray-900 dark:text-gray-100">
				Color Palette Visualizer
			</h1>
			<p className="text-center mb-10 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
				Use this page to help assign semantic roles (Primary, Secondary, Accent, Text, Background, etc.) to colors. Click section titles to expand/collapse.
			</p>

			<div className="w-full max-w-4xl mx-auto space-y-4"> {/* Added max-width and spacing */}
				{colorEntries.map(([colorName, shades]) => (
					<Disclosure key={colorName} as="div" className="bg-white dark:bg-gray-800 shadow rounded-lg">
						{({ open }) => (
							<>
								<DisclosureButton className="flex justify-between w-full px-4 py-3 text-lg font-medium text-left text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring focus-visible:ring-text-link focus-visible:ring-opacity-75 rounded-lg">
									<span className="capitalize">{colorName.replace('sc-', 'SC ')}</span>
									<ChevronUpIcon
										className={`${open ? 'rotate-180 transform' : ''
											} h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform`}
									/>
								</DisclosureButton>
								<Transition
									enter="transition duration-100 ease-out"
									enterFrom="transform scale-95 opacity-0"
									enterTo="transform scale-100 opacity-100"
									leave="transition duration-75 ease-out"
									leaveFrom="transform scale-100 opacity-100"
									leaveTo="transform scale-95 opacity-0">
									<DisclosurePanel className="px-4 pt-2 pb-4 text-sm text-gray-500 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700">
										<div className="space-y-3 mt-3">
											{Object.entries(shades).map(([shade, hex]) => {
												const shadeNum = parseInt(shade);
												const textColorClass = getTextColorForBg(shadeNum);
												const hoverShade = getHoverBgShade(shadeNum);
												const hoverBgClass = `hover:bg-${colorName}-${hoverShade}`;
												const borderShade = getBorderShade(shadeNum);
												const hoverBorderClass = `hover:border-${colorName}-${borderShade}`;
												const bgClass = `bg-${colorName}-${shade}`;

												return (
													<div key={`${colorName}-${shade}`} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
														{/* Column 1: Base Color Button */}
														<div className={`p-3 rounded-md shadow ${bgClass} ${textColorClass} transition-colors duration-150 flex items-center justify-between`}>
															<div>
																<span className="font-medium block sm:inline">Base:</span> {`${colorName}-${shade}`}
																<span className="block text-xs opacity-80">({hex})</span>
															</div>
															<button
																onClick={() => navigator.clipboard.writeText(hex)}
																className={`text-xs font-semibold ${shadeNum <= 400 ? 'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300' : 'text-blue-300 hover:text-blue-100 dark:text-blue-400 dark:hover:text-blue-300'} ml-2 focus:outline-none underline whitespace-nowrap`}
																title={`Copy ${hex}`}
															>
																Copy
															</button>
														</div>

														{/* Column 2: Hover Background Example */}
														<button
															type="button"
															className={`p-3 rounded-md shadow ${bgClass} ${textColorClass} ${hoverBgClass} transition-colors duration-150 text-left w-full`}
														>
															<span className="font-medium">Hover BG:</span> {`${colorName}-${shade}`}
															<div className="text-sm opacity-80 mt-1">(Hover Shade: {hoverShade})</div>
														</button>

														{/* Column 3: Hover Border Example */}
														<button
															type="button"
															// Apply base bg/text + TRANSPARENT initial border + COLORED hover border
															className={`p-3 rounded-md shadow ${bgClass} ${textColorClass} border-2 border-transparent ${hoverBorderClass} transition-colors duration-150 text-left w-full`}
														>
															<span className="font-medium">Hover Border:</span> {`${colorName}-${shade}`}
															<div className="text-sm opacity-80 mt-1">(Border Shade: {borderShade})</div>
														</button>
													</div>
												);
											})}
										</div>
									</DisclosurePanel>
								</Transition>
							</>
						)}
					</Disclosure>
				))}
			</div>
		</Container>
	);
}
