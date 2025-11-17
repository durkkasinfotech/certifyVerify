/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        heading: ["Playfair Display", "Georgia", "serif"],
        display: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        primary: "#2878eb",
        secondary: "#f14d5d",
        dark: "#120f2d",
        light: "#ecf4ff",
      },
      boxShadow: {
        soft: "0 20px 45px rgba(18, 15, 45, 0.1)",
      },
      backgroundImage: {
        "hero-overlay": "linear-gradient(rgba(18, 15, 45, 0.85), rgba(18, 15, 45, 0.85))",
      },
    },
  },
  plugins: [],
};
