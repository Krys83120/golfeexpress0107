const { tailwindColors } = require("@golfeexpress/ui-tokens");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: tailwindColors,
      fontFamily: {
        heading: ["Montserrat", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "16px",
        sm: "12px",
      },
    },
  },
  plugins: [],
};
