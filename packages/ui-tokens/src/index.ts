/**
 * Design tokens extraits des maquettes HTML fournies
 * (golfeexpress_client.html, _livreur.html, _pro.html, _admin.html).
 *
 * Source unique de vérité pour :
 *  - tailwind.config.js des 4 apps (web et mobile via NativeWind)
 *  - usage direct en JS (StyleSheet React Native, styles inline)
 */

export const colors = {
  golfeGreen: "#2ECC71",
  golfeGreenDark: "#27AE60",
  corail: "#FF6B35",
  corailLight: "#FF8C5A",
  sable: "#F5F0E8",
  nuit: "#1A1A2E",
  gris: "#6B7280",
  grisLight: "#F3F4F6",
  blanc: "#FFFFFF",

  // Tons additionnels vus dans les maquettes Pro/Admin (badges, stats)
  statusPendingBg: "#FFF3E0",
  statusPendingText: "#FF6B35",
  statusBlueBg: "#E3F2FD",
  statusBlueText: "#2196F3",
  statusPurpleBg: "#F3E5F5",
  statusPurpleText: "#9C27B0",
  statusGreenBg: "#E8F5E9",
  statusGreenText: "#2ECC71",
} as const;

export const gradients = {
  golfeGreen: [colors.golfeGreen, colors.golfeGreenDark] as const,
  corail: [colors.corail, colors.corailLight] as const,
};

export const radii = {
  lg: 16, // var(--radius)
  md: 12, // var(--radius-sm)
  full: 9999,
};

export const shadows = {
  // valeurs utilisables avec react-native-shadow / boxShadow web
  card: "0 4px 20px rgba(0,0,0,0.08)",
  cardLg: "0 10px 40px rgba(0,0,0,0.12)",
};

export const fonts = {
  heading: "Montserrat", // 700 / 800
  body: "Inter", // 400 / 500 / 600
};

export const fontWeights = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

/** Mascotte de l'app — utilisée dans les splash screens, headers, suivi de commande */
export const mascotte = {
  name: "Rocco",
  emoji: "🦎",
};

/** Pour Tailwind (web) — à spread dans theme.extend.colors */
export const tailwindColors = {
  "golfe-green": colors.golfeGreen,
  "golfe-green-dark": colors.golfeGreenDark,
  corail: colors.corail,
  "corail-light": colors.corailLight,
  sable: colors.sable,
  nuit: colors.nuit,
  gris: colors.gris,
  "gris-light": colors.grisLight,
};
