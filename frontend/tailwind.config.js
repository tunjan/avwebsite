/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      // --- CHANGE: Override the default border radius ---
      borderRadius: {
        'none': '0',
        'sm': '0',
        'DEFAULT': '0',
        'md': '0',
        'lg': '0',
        'xl': '0',
        '2xl': '0',
        '3xl': '0',
        'full': '0',
      },
      // --- CHANGE: Extend the color palette ---
      extend: {
        colors: {
          primary: '#d81313', // Our main accent red
        },
      },
    },
    plugins: [],
  }