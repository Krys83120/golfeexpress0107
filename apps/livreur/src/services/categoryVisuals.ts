import { ProCategory } from "@golfeexpress/types";

const CATEGORY_EMOJIS: Record<ProCategory, string> = {
  [ProCategory.RESTAURANT]: "🍽️",
  [ProCategory.BOULANGERIE]: "🥖",
  [ProCategory.BOUCHERIE]: "🥩",
  [ProCategory.EPICERIE]: "🛒",
  [ProCategory.PHARMACIE]: "💊",
  [ProCategory.FLEURISTE]: "💐",
  [ProCategory.LIBRAIRIE]: "📚",
  [ProCategory.PARFUMERIE]: "🧴",
  [ProCategory.AUTRE]: "📦",
};

export function getCategoryEmoji(category: ProCategory): string {
  return CATEGORY_EMOJIS[category] ?? CATEGORY_EMOJIS[ProCategory.AUTRE];
}

/** Calcule la distance à vol d'oiseau en km entre deux coordonnées (formule de Haversine). */
export function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
