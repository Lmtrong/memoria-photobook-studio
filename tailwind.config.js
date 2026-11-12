/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: '#F8F5F0',
        cream: '#EFE9DF',
        beige: '#E3D7C8',
        taupe: '#B99B83',
        terracotta: '#9C7560',
        charcoal: '#39332F',
        gold: '#C5A059',
        rose: '#D6A29C',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', '"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', 'sans-serif'],
        handwriting: ['"Caveat"', '"Dancing Script"', 'cursive'],
        editorial: ['"Libre Baskerville"', 'Georgia', 'serif'],
      },
      boxShadow: {
        'paper': '0 4px 20px -2px rgba(57, 51, 47, 0.08), 0 1px 4px -1px rgba(57, 51, 47, 0.04)',
        'book': '0 25px 50px -12px rgba(57, 51, 47, 0.35), 0 8px 20px -6px rgba(57, 51, 47, 0.2)',
        'page-left': 'inset -24px 0 36px -12px rgba(57, 51, 47, 0.16), -4px 4px 12px rgba(57, 51, 47, 0.08)',
        'page-right': 'inset 24px 0 36px -12px rgba(57, 51, 47, 0.16), 4px 4px 12px rgba(57, 51, 47, 0.08)',
      }
    },
  },
  plugins: [],
}
