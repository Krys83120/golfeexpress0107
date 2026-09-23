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
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.RIDER_ASSIGNED],
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

/**
 * Qui a le droit de déclencher quelle transition. PRO_EMPLOYEE a
 * volontairement les mêmes droits que PRO ici -- un employé traite les
 * commandes de sa boutique exactement comme le patron (démarrer la
 * préparation, marquer prête, annuler). La restriction employé porte sur
 * les DONNÉES qu'il peut voir/faire ailleurs (Finances, Réglages...), pas
 * sur le traitement des commandes elles-mêmes -- voir ProEmployee dans
 * prisma/schema.prisma.
 *
 * PENDING -> CONFIRMED n'est PAS ouvert au Pro/employé (23/08/2026) : cette
 * transition ne doit être déclenchée QUE par la confirmation d'un paiement
 * Stripe réel (voir webhooks/stripe/route.ts, event
 * payment_intent.succeeded), jamais manuellement -- un Pro qui pouvait
 * "Confirmer" une commande à la main pouvait par erreur (ou abus) faire
 * avancer une commande jamais payée. Seul Admin/Super Admin garde cette
 * transition, réservée aux interventions de support exceptionnelles (ex:
 * paiement vérifié manuellement côté Stripe Dashboard suite à un webhook en
 * échec).
 */
const TRANSITION_OWNERS: Partial<Record<OrderStatus, UserRole[]>> = {
  [OrderStatus.CONFIRMED]: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  [OrderStatus.PREPARING]: [UserRole.PRO, UserRole.PRO_EMPLOYEE],
  [OrderStatus.READY]: [UserRole.PRO, UserRole.PRO_EMPLOYEE],
  [OrderStatus.RIDER_ASSIGNED]: [UserRole.RIDER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
  [OrderStatus.PICKED_UP]: [UserRole.RIDER],
  [OrderStatus.IN_DELIVERY]: [UserRole.RIDER],
  [OrderStatus.DELIVERED]: [UserRole.RIDER],
  [OrderStatus.CANCELLED]: [UserRole.CLIENT, UserRole.PRO, UserRole.PRO_EMPLOYEE, UserRole.ADMIN, UserRole.SUPER_ADMIN],
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

/**
 * Annulation forcée réservée à l'Admin (ajout du 23/09/2026, suite à une
 * commande restée bloquée en RIDER_ASSIGNED sans jamais être marquée
 * prête). CANCELLABLE_FROM ci-dessus exclut volontairement
 * RIDER_ASSIGNED/PICKED_UP/IN_DELIVERY pour canTransition -- ce serait trop
 * dangereux d'ouvrir l'annulation "classique" (accessible à
 * Client/Pro/Rider) une fois un livreur déjà en route. Cette fonction
 * distincte n'est utilisée QUE par la route
 * admin/orders/[orderId]/force-cancel (réservée ADMIN/SUPER_ADMIN au niveau
 * de la route elle-même, voir requireAuth) -- jamais par la route générale
 * orders/[orderId]/status, qui continue d'utiliser canTransition/
 * CANCELLABLE_FROM sans changement pour tous les autres rôles.
 */
export function canAdminForceCancel(current: OrderStatus): boolean {
  return current !== OrderStatus.CANCELLED && current !== OrderStatus.DELIVERED && current !== OrderStatus.REFUNDED;
}
