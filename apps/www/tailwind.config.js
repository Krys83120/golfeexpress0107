/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "golfe-green": "#2ECC71",
        "golfe-green-dark": "#27AE60",
        corail: "#FF6B35",
        "corail-light": "#FF8C5A",
        sable: "#F5F0E8",
        nuit: "#1A1A2E",
        "nuit-light": "#252542",
        gris: "#6B7280",
        "gris-light": "#F3F4F6",
      },
      fontFamily: {
        heading: ["var(--font-montserrat)", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
