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
        // Curseur qui glisse depuis en haut à droite jusqu'au bouton, "clique"
        // (petit scale-down), puis disparaît avant de recommencer — attire
        // l'œil sur le bouton principal sans gêner le vrai clic (voir
        // Hero.tsx : l'élément est pointer-events-none).
        "cta-cursor": {
          "0%, 8%": { opacity: "0", transform: "translate(38px, -34px) scale(1)" },
          "22%": { opacity: "1", transform: "translate(38px, -34px) scale(1)" },
          "40%": { opacity: "1", transform: "translate(0, 0) scale(1)" },
          "46%": { opacity: "1", transform: "translate(0, 0) scale(0.82)" },
          "54%": { opacity: "1", transform: "translate(0, 0) scale(1)" },
          "82%": { opacity: "1", transform: "translate(0, 0) scale(1)" },
          "94%, 100%": { opacity: "0", transform: "translate(38px, -34px) scale(1)" },
        },
        "cta-cursor-ripple": {
          "0%, 44%": { opacity: "0", transform: "scale(0.3)" },
          "48%": { opacity: "0.55", transform: "scale(0.3)" },
          "68%, 100%": { opacity: "0", transform: "scale(2)" },
        },
      },
      animation: {
        "cta-cursor": "cta-cursor 3.6s ease-in-out infinite",
        "cta-cursor-ripple": "cta-cursor-ripple 3.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
