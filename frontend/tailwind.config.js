/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand colors from guidelines - PRIMARY COLOR is #ccdb53
        primary: {
          DEFAULT: '#ccdb53',  // PRIMARY BRAND COLOR - olive/yellow-green (mystery and depth)
          light: '#ebf4e5',    // Light background color
          dark: '#838a36',     // Dark olive - serene, calming twilight
        },
        // Accent colors
        accent: {
          lime: '#c8ff09',     // Vibrant lime - for attention-grabbing elements only
        },
        // Background colors
        brand: {
          primary: '#ccdb53',  // PRIMARY BRAND COLOR
          lime: '#c8ff09',     // Accent lime for attention
          olive: '#838a36',    // Dark olive
          'light-bg': '#ebf4e5', // Light background
        },
        dark: {
          DEFAULT: '#1F2937',
          light: '#374151',
        },
        light: {
          DEFAULT: '#ebf4e5',  // Brand light background
          dark: '#E5E7EB',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      backgroundColor: {
        'brand-light': '#ebf4e5',
      },
    },
  },
  plugins: [],
}
 
