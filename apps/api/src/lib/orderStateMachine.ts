import { OrderStatus, UserRole } from "@golfeexpress/types";

/**
 * Transitions de statut autorisées. Clé = statut actuel, valeur = statuts
 * vers lesquels on peut basculer depuis ce statut.
 *
 * CANCELLED et REFUNDED sont des état terminaux atteignables depuis presque
 * n'importe quel statut non-terminal (annulation), donc traités à part dans
 * `canTransition` plutôt que listés ici partout.
 */
const FORWARD_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING],
  [OrderStatus.PREPARING]: [OrderStatus.READY],
  [OrderStatus.READY]: [OrderStatus.RIDER_ASSIGNED],
  [OrderStatus.RIDER_ASSIGNED]: [OrderStatus.PICKED_UP],
  [OrderStatus.PICKED_UP]: [OrderStatus.IN_DELIVERY],
  [OrderStatus.IN_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
};

const CANCELLABLE_FROM: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
];

/** Qui a le droit de déclencher quelle transition. */
const TRANSITION_OWNERS: Partial<Record<OrderStatus, UserRole[]>> = {
  [OrderStatus.CONFIRMED]: [UserRole.PRO],
  [OrderStatus.PREPARING]: [UserRole.PRO],
  [OrderStatus.READY]: [UserRole.PRO],
  [OrderStatus.RIDER_ASSIGNED]: [UserRole.RIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
  [OrderStatus.PICKED_UP]: [UserRole.RIDER],
  [OrderStatus.IN_DELIVERY]: [UserRole.RIDER],
  [OrderStatus.DELIVERED]: [UserRole.RIDER],
  [OrderStatus.CANCELLED]: [UserRole.CLIENT, UserRole.PRO, UserRole.ADMIN, UserRole.SUPER_ADMIN],
};

export function canTransition(current: OrderStatus, next: OrderStatus): boolean {
  if (next === OrderStatus.CANCELLED) {
    return CANCELLABLE_FROM.includes(current);
  }
  return FORWARD_TRANSITIONS[current]?.includes(next) ?? false;
}

export function isTransitionAllowedForRole(next: OrderStatus, role: UserRole): boolean {
  const owners = TRANSITION_OWNERS[next];
  if (!owners) return false;
  return owners.includes(role);
}
