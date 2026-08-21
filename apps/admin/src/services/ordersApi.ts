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
 * Note : l'endpoint plafonne à 50 commandes (les plus récentes en
 * premier). Suffisant pour une vue "temps réel" du flux en cours ; pour un
 * historique complet il faudrait un endpoint paginé dédié.
 */
export async function fetchAllOrders(statusFilter?: OrderStatus[]): Promise<Order[]> {
  const query = statusFilter && statusFilter.length > 0 ? `?status=${statusFilter.join(",")}` : "";
  const data = await apiFetch<{ orders: Order[] }>(`/api/orders${query}`);
  return data.orders;
}