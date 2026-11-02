/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: { lime: "#c6ff00", ink: "#05060a", alert: "#ff2d55" },
      fontFamily: {
        display: ["Anton", "Impact", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};