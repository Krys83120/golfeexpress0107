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