import { RiderStatus, VehicleType } from "@golfeexpress/types";

export const RIDER_STATUS_LABELS: Record<RiderStatus, { label: string; bg: string; text: string }> = {
  [RiderStatus.PENDING]: { label: "En attente", bg: "#FFF3E0", text: "#FF6B35" },
  [RiderStatus.ACTIVE]: { label: "Actif", bg: "#E8F5E9", text: "#2ECC71" },
  [RiderStatus.SUSPENDED]: { label: "Suspendu", bg: "#FFEBEE", text: "#F44336" },
  [RiderStatus.BANNED]: { label: "Banni", bg: "#F3F4F6", text: "#6B7280" },
};

export const ADMIN_VEHICLE_LABELS: Record<VehicleType, { label: string; emoji: string }> = {
  [VehicleType.SCOOTER]: { label: "Scooter", emoji: "🛵" },
  [VehicleType.VOITURE]: { label: "Voiture", emoji: "🚗" },
  [VehicleType.VELO]: { label: "Vélo", emoji: "🚲" },
  [VehicleType.ELECTRIQUE]: { label: "Électrique", emoji: "⚡" },
};
