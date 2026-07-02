import { ProCategory, VehicleType } from "@golfeexpress/types";
import type { PendingPro, PendingRider } from "@/services/validationsApi";

export type ValidationKind = "PRO" | "RIDER";

export interface PendingValidation {
  id: string;
  kind: ValidationKind;
  name: string;
  subtitle: string;
  emoji: string;
  submittedAtLabel: string;
}

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

const VEHICLE_EMOJIS: Record<VehicleType, string> = {
  [VehicleType.SCOOTER]: "🛵",
  [VehicleType.VOITURE]: "🚗",
  [VehicleType.VELO]: "🚲",
  [VehicleType.ELECTRIQUE]: "⚡",
};

function formatSubmittedAt(isoDate: string): string {
  const hours = Math.round((Date.now() - new Date(isoDate).getTime()) / 3600000);
  if (hours < 1) return "à l'instant";
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${Math.round(hours / 24)}j`;
}

export function proToPendingValidation(pro: PendingPro): PendingValidation {
  return {
    id: pro.id,
    kind: "PRO",
    name: pro.businessName,
    subtitle: `${pro.user.firstName} ${pro.user.lastName} · SIRET ${pro.siret}`,
    emoji: CATEGORY_EMOJIS[pro.category] ?? "📦",
    submittedAtLabel: formatSubmittedAt(pro.createdAt),
  };
}

export function riderToPendingValidation(rider: PendingRider): PendingValidation {
  return {
    id: rider.id,
    kind: "RIDER",
    name: `${rider.user.firstName} ${rider.user.lastName}`,
    subtitle: `${rider.user.phone} · Pièce d'identité soumise`,
    emoji: VEHICLE_EMOJIS[rider.vehicleType] ?? "🛵",
    submittedAtLabel: formatSubmittedAt(rider.createdAt),
  };
}
