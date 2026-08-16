import { ProCategory } from "@golfeexpress/types";

/**
 * Dérive l'emoji et les couleurs de dégradé d'un Pro à partir de sa
 * catégorie — évite de stocker ces informations purement visuelles en base
 * (elles n'ont rien à faire dans le modèle Prisma `Pro`).
 */
interface CategoryVisual {
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
}

const CATEGORY_VISUALS: Record<ProCategory, CategoryVisual> = {
  [ProCategory.RESTAURANT]: { emoji: "🍽️", gradientFrom: "#FF8C5A", gradientTo: "#FF6B35" },
  [ProCategory.BOULANGERIE]: { emoji: "🥖", gradientFrom: "#FF9800", gradientTo: "#FFB74D" },
  [ProCategory.BOUCHERIE]: { emoji: "🥩", gradientFrom: "#8B4513", gradientTo: "#A0522D" },
  [ProCategory.EPICERIE]: { emoji: "🛒", gradientFrom: "#66BB6A", gradientTo: "#81C784" },
  [ProCategory.PHARMACIE]: { emoji: "💊", gradientFrom: "#4CAF50", gradientTo: "#66BB6A" },
  [ProCategory.FLEURISTE]: { emoji: "💐", gradientFrom: "#2ECC71", gradientTo: "#27AE60" },
  [ProCategory.LIBRAIRIE]: { emoji: "📚", gradientFrom: "#2196F3", gradientTo: "#42A5F5" },
  [ProCategory.PARFUMERIE]: { emoji: "🧴", gradientFrom: "#FF69B4", gradientTo: "#FFB6C1" },
  [ProCategory.AUTRE]: { emoji: "📦", gradientFrom: "#9E9E9E", gradientTo: "#BDBDBD" },
};

export function getCategoryVisual(category: ProCategory): CategoryVisual {
  return CATEGORY_VISUALS[category] ?? CATEGORY_VISUALS[ProCategory.AUTRE];
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

/**
 * Estimation du temps total (préparation + trajet) affiché sur la fiche
 * Pro : trajet dérivé de la distance (15 km/h moyen en scooter urbain),
 * préparation dérivée du `defaultPrepTimeMinutes` réel du commerçant (voir
 * Pro Settings côté apps/pro) — plutôt qu'une marge fixe de 10 min qui
 * ignorait totalement ce réglage.
 */
export function estimateDeliveryMinutes(distanceKm: number, prepTimeMinutes: number = 10): { min: number; max: number } {
  const travelMinutes = (distanceKm / 15) * 60;
  const prep = Math.max(0, prepTimeMinutes);
  return {
    min: Math.max(10, Math.round(travelMinutes * 0.8 + prep * 0.7)),
    max: Math.max(20, Math.round(travelMinutes * 1.4 + prep)),
  };
}
