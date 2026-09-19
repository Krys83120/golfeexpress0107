import { ParcelOrderStatus, PaymentStatus } from "@golfeexpress/types";

/**
 * Labels Colis Express (19/09/2026) -- même forme que orderStatusLabels.ts
 * et paymentStatusLabels.ts (utilisés pour Order), regroupés ici dans un
 * seul fichier plutôt qu'éclatés en deux : domaine plus restreint. Types
 * ParcelOrderStatus/PaymentStatus distincts de OrderStatus côté TypeScript
 * (énums nominaux) -- on ne peut pas réutiliser directement les helpers
 * getPaymentBadgeTone/getPaymentBadgeLabel existants malgré des valeurs
 * identiques, d'où cette petite duplication volontaire.
 */
export const PARCEL_ORDER_STATUS_LABELS: Record<ParcelOrderStatus, { label: string; bg: string; text: string }> = {
  [ParcelOrderStatus.PENDING]: { label: "En attente", bg: "#FFF3E0", text: "#FF6B35" },
  [ParcelOrderStatus.CONFIRMED]: { label: "Confirmée", bg: "#E3F2FD", text: "#2196F3" },
  [ParcelOrderStatus.RIDER_ASSIGNED]: { label: "Livreur assigné", bg: "#F3E5F5", text: "#9C27B0" },
  [ParcelOrderStatus.PICKED_UP]: { label: "Récupéré", bg: "#F3E5F5", text: "#9C27B0" },
  [ParcelOrderStatus.IN_DELIVERY]: { label: "En livraison", bg: "#F3E5F5", text: "#9C27B0" },
  [ParcelOrderStatus.DELIVERED]: { label: "Livré", bg: "#E8F5E9", text: "#2ECC71" },
  [ParcelOrderStatus.CANCELLED]: { label: "Annulé", bg: "#FFEBEE", text: "#F44336" },
};

export type ParcelPaymentBadgeTone = "pending" | "paid" | "cancelled";

export const PARCEL_PAYMENT_BADGE_STYLES: Record<ParcelPaymentBadgeTone, { bg: string; text: string }> = {
  pending: { bg: "#FFF3E0", text: "#FF6B35" },
  paid: { bg: "#E8F5E9", text: "#2ECC71" },
  cancelled: { bg: "#FFEBEE", text: "#F44336" },
};

export function getParcelPaymentBadgeTone(p: {
  status: ParcelOrderStatus;
  paymentStatus: PaymentStatus;
}): ParcelPaymentBadgeTone {
  if (p.status === ParcelOrderStatus.CANCELLED) return "cancelled";
  if (p.paymentStatus === PaymentStatus.CAPTURED) return "paid";
  if (p.paymentStatus === PaymentStatus.FAILED || p.paymentStatus === PaymentStatus.REFUNDED) return "cancelled";
  return "pending";
}

export function getParcelPaymentBadgeLabel(p: { status: ParcelOrderStatus; paymentStatus: PaymentStatus }): string {
  const tone = getParcelPaymentBadgeTone(p);
  if (tone === "paid") return "Payée";
  if (tone === "cancelled") {
    if (p.status === ParcelOrderStatus.CANCELLED) return "Annulée";
    if (p.paymentStatus === PaymentStatus.REFUNDED) return "Remboursée";
    return "Paiement échoué";
  }
  return "Paiement en attente";
}
