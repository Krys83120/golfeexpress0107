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

// Seules les transitions PENDING -> CONFIRMED -> PREPARING -> READY sont
// déclenchables par le Pro (au-delà, c'est le Rider qui fait avancer le
// statut) — cohérent avec la machine à états côté API
// (apps/api/src/lib/orderStateMachine.ts, TRANSITION_OWNERS).
export const NEXT_ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.PENDING]: "Confirmer",
  [OrderStatus.CONFIRMED]: "Démarrer la préparation",
  [OrderStatus.PREPARING]: "Marquer comme prête",
};
