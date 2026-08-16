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
      keyframes: {
        // Main qui arrive, "tape" (deux petits scale-down = deux tapotements),
        // reste posée sur le bouton, puis repart avant de recommencer — la
        // position de repos (translate(0,0)) est calibrée dans Hero.tsx pour
        // que le bout du doigt (repère visuel des traits violets sur
        // l'image) tombe VRAIMENT sur le bouton, pas à côté.
        "cta-tap-hand": {
          "0%, 6%": { opacity: "0", transform: "translate(10px, -8px) scale(0.7)" },
          "18%": { opacity: "1", transform: "translate(0, 0) scale(1)" },
          "24%": { transform: "translate(0, 0) scale(0.86)" },
          "30%": { transform: "translate(0, 0) scale(1)" },
          "34%": { transform: "translate(0, 0) scale(0.9)" },
          "38%": { transform: "translate(0, 0) scale(1)" },
          "80%": { opacity: "1", transform: "translate(0, 0) scale(1)" },
          "94%, 100%": { opacity: "0", transform: "translate(10px, -8px) scale(0.7)" },
        },
      },
      animation: {
        "cta-tap-hand": "cta-tap-hand 3.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
