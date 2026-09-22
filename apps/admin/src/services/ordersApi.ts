import { apiFetch } from "@/services/apiClient";
import type { Order, OrderStatus } from "@golfeexpress/types";

/**
 * GET /api/orders — vue Admin.
 *
 * Pour un rôle ADMIN/SUPER_ADMIN, cet endpoint renvoie déjà l'ensemble des
 * commandes de la plateforme (tous commerçants confondus), sans filtre
 * additionnel côté serveur — voir apps/api/src/app/api/orders/route.ts,
 * bloc "ADMIN / SUPER_ADMIN : pas de filtre additionnel, vue complète."
 *
 * Note : l'endpoint plafonne à 1000 commandes pour ce rôle (les plus
 * récentes en premier, voir le `take` conditionnel par rôle côté route).
 * Suffisant pour la traçabilité + les statistiques panier moyen
 * jour/semaine/mois d'un usage normal ; au-delà, il faudrait un endpoint
 * paginé dédié ou le filtre `from`/`to` déjà supporté côté serveur mais pas
 * encore branché ici.
 */
export async function fetchAllOrders(statusFilter?: OrderStatus[]): Promise<Order[]> {
  const query = statusFilter && statusFilter.length > 0 ? `?status=${statusFilter.join(",")}` : "";
  const data = await apiFetch<{ orders: Order[] }>(`/api/orders${query}`);
  return data.orders;
}

/**
 * PATCH /api/admin/orders/[orderId]/mark-test — bascule Order.isTest.
 *
 * N'est acceptée par le serveur que tant que la commande est encore
 * PENDING/impayée (voir la route pour le détail) — permet de désigner une
 * commande comme "commande de test" avant de la faire avancer manuellement
 * via testTransitionOrder, sans jamais toucher au circuit réel (Stripe,
 * emails, gains Pro/Rider, points fidélité).
 */
export async function markOrderAsTest(orderId: string, isTest: boolean): Promise<Order> {
  const data = await apiFetch<{ order: Order }>(`/api/admin/orders/${orderId}/mark-test`, {
    method: "PATCH",
    body: { isTest },
  });
  return data.order;
}

/**
 * PATCH /api/admin/orders/[orderId]/test-transition — fait avancer d'UNE
 * étape une commande de test (voir markOrderAsTest ci-dessus). Le serveur
 * refuse toute étape qui n'est pas l'étape suivante immédiate du cycle
 * simplifié de test, et refuse toute commande dont isTest n'est pas true.
 */
export async function testTransitionOrder(orderId: string, status: OrderStatus): Promise<Order> {
  const data = await apiFetch<{ order: Order }>(`/api/admin/orders/${orderId}/test-transition`, {
    method: "PATCH",
    body: { status },
  });
  return data.order;
}