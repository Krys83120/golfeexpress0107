const { tailwindColors } = require("@golfeexpress/ui-tokens");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: tailwindColors,
      borderRadius: {
        DEFAULT: "16px",
        sm: "12px",
      },
      fontFamily: {
        heading: ["Montserrat_700Bold", "Montserrat_800ExtraBold"],
        body: ["Inter_400Regular", "Inter_500Medium", "Inter_600SemiBold"],
      },
    },
  },
  plugins: [],
};
