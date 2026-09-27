import { RiderStatus, RiderVerificationStatus, VehicleType } from "@golfeexpress/types";

export const RIDER_STATUS_LABELS: Record<RiderStatus, { label: string; bg: string; text: string }> = {
  [RiderStatus.PENDING]: { label: "En attente", bg: "#FFF3E0", text: "#FF6B35" },
  [RiderStatus.ACTIVE]: { label: "Actif", bg: "#E8F5E9", text: "#2ECC71" },
  [RiderStatus.SUSPENDED]: { label: "Suspendu", bg: "#FFEBEE", text: "#F44336" },
  [RiderStatus.BANNED]: { label: "Banni", bg: "#F3F4F6", text: "#6B7280" },
};

/**
 * Statut de vérification KYC/immatriculation (ajout du 27/09/2026, demande
 * de Krys) -- distinct de RIDER_STATUS_LABELS ci-dessus. Bloque le passage
 * en ligne et l'acceptation d'une course tant que VERIFIED n'est pas atteint
 * (voir riders/me/online, orders/[orderId]/accept, parcel-orders/accept).
 */
export const RIDER_VERIFICATION_STATUS_LABELS: Record<
  RiderVerificationStatus,
  { label: string; bg: string; text: string; emoji: string }
> = {
  [RiderVerificationStatus.UNVERIFIED]: { label: "Non vérifié", bg: "#FFEBEE", text: "#F44336", emoji: "🔴" },
  [RiderVerificationStatus.PENDING_REGISTRATION]: {
    label: "En attente d'immatriculation",
    bg: "#FFF3E0",
    text: "#FF6B35",
    emoji: "🟠",
  },
  [RiderVerificationStatus.VERIFIED]: { label: "Vérifié", bg: "#E8F5E9", text: "#2ECC71", emoji: "🟢" },
};

export const ADMIN_VEHICLE_LABELS: Record<VehicleType, { label: string; emoji: string }> = {
  [VehicleType.SCOOTER]: { label: "Scooter", emoji: "🛵" },
  [VehicleType.VOITURE]: { label: "Voiture", emoji: "🚗" },
  [VehicleType.VELO]: { label: "Vélo", emoji: "🚲" },
  [VehicleType.ELECTRIQUE]: { label: "Électrique", emoji: "⚡" },
};
