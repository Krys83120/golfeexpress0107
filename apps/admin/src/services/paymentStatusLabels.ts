import { OrderStatus, PaymentStatus, type Order } from "@golfeexpress/types";

/**
 * Code couleur "paiement" à 3 états, ORTHOGONAL au statut de traitement
 * habituel (voir orderStatusLabels.ts, qui a ses propres couleurs par
 * étape du kanban) -- demandé pour repérer d'un coup d'œil, indépendamment
 * de l'étape de préparation/livraison, si une commande est : pas encore
 * payée (orange), payée (vert), ou annulée/remboursée/paiement échoué
 * (rouge). Échange produit du 23/08/2026 : "utilisez un code couleur pour
 * d'un coup d'œil une commande en attente [soit] en orange, payée en vert
 * et annulée en rouge".
 *
 * Le statut CANCELLED de la commande prime sur le paymentStatus : une
 * commande annulée reste rouge même si elle avait déjà été payée avant
 * annulation (le remboursement éventuel se traite séparément, voir
 * Finances) -- on ne veut pas qu'une commande annulée mais pas-encore-
 * remboursée ressorte "verte" par erreur.
 */
export type PaymentBadgeTone = "pending" | "paid" | "cancelled";

export const PAYMENT_BADGE_STYLES: Record<PaymentBadgeTone, { bg: string; text: string }> = {
  pending: { bg: "#FFF3E0", text: "#FF6B35" },
  paid: { bg: "#E8F5E9", text: "#2ECC71" },
  cancelled: { bg: "#FFEBEE", text: "#F44336" },
};

export function getPaymentBadgeTone(order: Pick<Order, "status" | "paymentStatus">): PaymentBadgeTone {
  if (order.status === OrderStatus.CANCELLED) return "cancelled";
  if (order.paymentStatus === PaymentStatus.CAPTURED) return "paid";
  if (order.paymentStatus === PaymentStatus.FAILED || order.paymentStatus === PaymentStatus.REFUNDED) return "cancelled";
  // PENDING ou AUTHORIZED -- paiement initié mais pas encore confirmé par Stripe.
  return "pending";
}

export function getPaymentBadgeLabel(order: Pick<Order, "status" | "paymentStatus">): string {
  const tone = getPaymentBadgeTone(order);
  if (tone === "paid") return "Payée";
  if (tone === "cancelled") {
    if (order.status === OrderStatus.CANCELLED) return "Annulée";
    if (order.paymentStatus === PaymentStatus.REFUNDED) return "Remboursée";
    return "Paiement échoué";
  }
  return "Paiement en attente";
}
