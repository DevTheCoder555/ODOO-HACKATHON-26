/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        odoo: {
          primary: '#714B67',
          dark: '#583A50',
          light: '#F8F4F7',
          teal: '#008784',
          accent: '#017E84',
          purple: '#6C5CE7'
        }
      }
    },
  },
  plugins: [],
}

