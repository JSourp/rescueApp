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
        'sc-sandal': { // Light Brownish Yellow, pulled from logo
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
        'sc-asparagus': { // Light Olive Green
          '50': '#f2f7ee',
          '100': '#e3ecdb',
          '200': '#cadbbb',
          '300': '#a9c492',
          '400': '#80a663', // DEFAULT
          '500': '#6c9151',
          '600': '#53723e',
          '700': '#415932',
          '800': '#37482c',
          '900': '#303f28',
          '950': '#172112',
        },
        'sc-gothic': { // Dark Grayish Blue
          '50': '#f2f7f9',
          '100': '#dfeaee',
          '200': '#c3d7de',
          '300': '#99b9c7',
          '400': '#6390a6', // DEFAULT
          '500': '#4c778e',
          '600': '#426378',
          '700': '#3a5364',
          '800': '#364754',
          '900': '#303d49',
          '950': '#1c2630',
        },
        'sc-trendy-pink': { // Purplish Pink
          '50': '#fbf7fc',
          '100': '#f6eff8',
          '200': '#eedef0',
          '300': '#e1c4e3',
          '400': '#cea0d2',
          '500': '#b679bc',
          '600': '#a263a6', // DEFAULT
          '700': '#804982',
          '800': '#6a3d6b',
          '900': '#593659',
          '950': '#381a38',
        },
        'sc-fuscous-gray': { // Dark Brownish Gray
          '50': '#f4f4f2',
          '100': '#e3e3de',
          '200': '#c9c8bf',
          '300': '#aaa89a',
          '400': '#928e7d',
          '500': '#837e6f',
          '600': '#706a5e',
          '700': '#5b554d',
          '800': '#514c46', // DEFAULT
          '900': '#46413d',
          '950': '#272421',
        },
        'sc-pumpkin': { // From sunset, Oranges/Terracottas
          '50': '#fff4ed',
          '100': '#ffe6d5',
          '200': '#feccaa',
          '300': '#fdac74',
          '400': '#fb8a3c',
          '500': '#f97316', // DEFAULT
          '600': '#ea670c',
          '700': '#c2570c',
          '800': '#9a4a12',
          '900': '#7c3d12',
          '950': '#432007',
        },
        'sc-chateau-green': { // From forest, Greens
          '50': '#f0fdf5',
          '100': '#dcfce8',
          '200': '#bbf7d1',
          '300': '#86efad',
          '400': '#4ade81',
          '500': '#22c55e',
          '600': '#16a34a',
          '700': '#15803c',
          '800': '#166533',
          '900': '#14532b',
          '950': '#052e14',
        },
        'sc-scooter': { // From ocean, Blues/Teals
          '50': '#ecfcff',
          '100': '#cff7fe',
          '200': '#a5effc',
          '300': '#67e4f9',
          '400': '#22d0ee',
          '500': '#06b6d4',
          '600': '#0899b2',
          '700': '#0e7d90',
          '800': '#156775',
          '900': '#165863',
          '950': '#083b44',
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
  safelist: [
    {
      pattern: /bg-sc-(sandal|asparagus|gothic|trendy-pink|fuscous-gray|pumpkin|chateau-green|scooter)-\d{2,3}/,
      variants: ['hover', 'focus'], // Include hover and focus variants
    },
    {
      pattern: /border-sc-(sandal|asparagus|gothic|trendy-pink|fuscous-gray|pumpkin|chateau-green|scooter)-\d{2,3}/,
    },
    {
      pattern: /text-sc-(sandal|asparagus|gothic|trendy-pink|fuscous-gray|pumpkin|chateau-green|scooter)-\d{2,3}/,
    },
    {
      pattern: /hover:border-sc-(sandal|asparagus|gothic|trendy-pink|fuscous-gray|pumpkin|chateau-green|scooter)-\d{2,3}/,
    },
  ],
  variants: {
    extend: {},
  },
  plugins: [],
};
export default config;
