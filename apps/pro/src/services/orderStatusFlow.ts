import { OrderStatus } from "@golfeexpress/types";

// Ordre logique de progression — utilisé pour proposer la prochaine action au Pro.
const ORDER_STATUS_FLOW: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.RIDER_ASSIGNED,
  OrderStatus.PICKED_UP,
  OrderStatus.IN_DELIVERY,
  OrderStatus.DELIVERED,
];

export function getNextStatus(current: OrderStatus): OrderStatus | null {
  const index = ORDER_STATUS_FLOW.indexOf(current);
  if (index === -1 || index === ORDER_STATUS_FLOW.length - 1) return null;
  return ORDER_STATUS_FLOW[index + 1];
}

// Seules les transitions CONFIRMED -> PREPARING -> READY sont déclenchables
// par le Pro (au-delà, c'est le Rider qui fait avancer le statut) —
// cohérent avec la machine à états côté API
// (apps/api/src/lib/orderStateMachine.ts, TRANSITION_OWNERS).
//
// PENDING volontairement absent d'ici (23/08/2026) : PENDING -> CONFIRMED ne
// doit se déclencher QUE par la confirmation d'un paiement Stripe réel
// (webhook payment_intent.succeeded), jamais par une action manuelle du Pro
// — d'ailleurs le Pro ne voit même plus les commandes PENDING dans sa file
// (voir GET /api/orders, excludePendingForPro), ce label n'aurait donc plus
// jamais l'occasion de s'afficher de toute façon.
export const NEXT_ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.CONFIRMED]: "Démarrer la préparation",
  [OrderStatus.PREPARING]: "Marquer comme prête",
};
