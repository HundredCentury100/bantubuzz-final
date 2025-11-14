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
          DEFAULT: '#B5E61D',
          light: '#C9F03F',
          dark: '#9ACF1A',
        },
        dark: {
          DEFAULT: '#1F2937',
          light: '#374151',
        },
        light: {
          DEFAULT: '#F3F4F6',
          dark: '#E5E7EB',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
