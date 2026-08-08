import { VehicleType } from "@golfeexpress/types";

/** Mapping statique type de véhicule -> libellé/emoji (pas de mock de données ici, juste un dictionnaire d'affichage). */
export const VEHICLE_LABELS: Record<VehicleType, { label: string; emoji: string }> = {
  [VehicleType.SCOOTER]: { label: "Scooter", emoji: "🛵" },
  [VehicleType.VOITURE]: { label: "Voiture", emoji: "🚗" },
  [VehicleType.VELO]: { label: "Vélo", emoji: "🚲" },
  [VehicleType.ELECTRIQUE]: { label: "Véhicule électrique", emoji: "⚡" },
};
