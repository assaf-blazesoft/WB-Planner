/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ops:         '#378ADD',
        economy:     '#1D9E75',
        feature:     '#7F77DD',
        ongoing:     '#888780',
        conditional: '#EF9F27',
      },
    },
  },
  plugins: [],
}
