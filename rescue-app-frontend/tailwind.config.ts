import type { Config } from "tailwindcss";

const defaultTheme = require("tailwindcss/defaultTheme");
const colors = require("tailwindcss/colors");

const config: Config = {
  mode: "jit",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        trueGray: colors.neutral,

        // --- Logo-Derived Earth Tones ---
        sand: {
          DEFAULT: '#F2EBD5',
          // Add shades 50-900 later using a generator tool
          // e.g., lighter: '#FAF8F0', darker: '#DACCB2'
        },
        'sc-tan': {
          '50': '#f6f5f0',
          '100': '#e9e3d8',
          '200': '#d5c9b3',
          '300': '#bca788',
          '400': '#a68863', // DEFAULT
          '500': '#997a59',
          '600': '#83634b',
          '700': '#6a4d3e',
          '800': '#5a4239',
          '900': '#4f3a34',
          '950': '#2d1f1b',
        },
        'dk-brown': { // Renamed to avoid conflict
          DEFAULT: '#735840',
          // Add shades 50-900 later using a generator tool
          // e.g., lighter: '#A18A77', darker: '#5A4330'
        },
        'dk-roast': { // Very dark brown
          DEFAULT: '#260101',
          // Add shades 50-900 later using a generator tool
          // e.g., lighter: '#6F3636', darker: '#1A0000'
        },

        // --- Accent Colors (Examples - Choose your own hex codes!) ---
        ocean: { // Blues/Teals
          light: '#67e8f9', // Example: cyan-300
          DEFAULT: '#06b6d4', // Example: cyan-500 (Adjust for desired "ocean" feel)
          dark: '#0e7490',  // Example: cyan-700
          // Add shades 50-900 later using a generator tool
        },
        forest: { // Greens
          light: '#86efac', // Example: green-300
          DEFAULT: '#16a34a', // Example: green-600 (Adjust for desired "forest" feel)
          dark: '#14532d',  // Example: green-900
          // Add shades 50-900 later using a generator tool
        },
        sunset: { // Oranges/Terracottas
          light: '#fdba74', // Example: orange-300
          DEFAULT: '#f97316', // Example: orange-500 (Adjust for desired "sunset" feel - maybe more muted like amber/terracotta)
          dark: '#c2410c',  // Example: orange-700
          // Add shades 50-900 later using a generator tool
        },

        // --- Neutrals (Example using Tailwind's 'stone') ---
        neutral: {
          '50': '#fafaf9',
          '100': '#f5f5f4',
          '200': '#e7e5e4',
          '300': '#d6d3d1',
          '400': '#a8a29e',
          '500': '#78716c', // DEFAULT
          '600': '#57534e',
          '700': '#44403c',
          '800': '#292524', // dark
          '900': '#1c1917',
          '950': '#0c0a09',
        }
      },
    },
    fontFamily: {
      sans: ["Inter", ...defaultTheme.fontFamily.sans],
      stock: [defaultTheme.fontFamily.sans],
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
export default config;
