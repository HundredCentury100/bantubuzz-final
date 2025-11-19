/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#ccdb53',
          light: '#d9e574',
          dark: '#b8c63d',
        },
        dark: {
          DEFAULT: '#1F2937',
          light: '#374151',
        },
        light: {
          DEFAULT: '#F3F4F6',
          dark: '#E5E7EB',
        },
        success: '#ccdb53',
        warning: '#ccdb53',
        error: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
 
