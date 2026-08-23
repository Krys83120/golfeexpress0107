import React from "react";
import type { Order } from "@golfeexpress/types";
import { PAYMENT_BADGE_STYLES, getPaymentBadgeTone, getPaymentBadgeLabel } from "@/services/paymentStatusLabels";

/**
 * Badge "paiement" (orange/vert/rouge) -- s'affiche EN PLUS du badge de
 * statut de traitement existant (ORDER_STATUS_LABELS / statusMeta), jamais
 * à sa place : les deux répondent à des questions différentes ("où en est
 * la préparation/livraison ?" vs "est-ce payé ?"). Voir paymentStatusLabels.ts.
 */
export function PaymentStatusBadge({ order }: { order: Pick<Order, "status" | "paymentStatus"> }) {
  const tone = getPaymentBadgeTone(order);
  const style = PAYMENT_BADGE_STYLES[tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: style.text }} />
      {getPaymentBadgeLabel(order)}
    </span>
  );
}
