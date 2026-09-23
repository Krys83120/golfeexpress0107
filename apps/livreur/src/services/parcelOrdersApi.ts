import { apiFetch } from "@/services/apiClient";
import type { ParcelOrder } from "@golfeexpress/types";

/**
 * Colis Express côté Livreur -- finition du workflow (23/09/2026, suite à
 * l'audit du même jour : la fonctionnalité existait déjà côté Pro/paiement
 * mais restait invisible côté Livreur). Même découpage exact que
 * ridersApi.ts pour les commandes classiques -- fichier à part plutôt que
 * mélangé : Colis Express est une table séparée (ParcelOrder), pas une
 * variante d'Order.
 */

/** GET /api/riders/me/available-parcel-orders -- demandes disponibles, pas encore prises. */
export async function fetchAvailableParcelOrders(): Promise<ParcelOrder[]> {
  const data = await apiFetch<{ parcelOrders: ParcelOrder[] }>("/api/riders/me/available-parcel-orders");
  return data.parcelOrders;
}

/**
 * GET /api/riders/me/parcel-orders -- demandes assignées à ce livreur (en
 * cours + historique), même principe que fetchMyDeliveries côté commandes
 * classiques.
 */
export async function fetchMyParcelDeliveries(statusFilter?: string[]): Promise<ParcelOrder[]> {
  const query = statusFilter && statusFilter.length > 0 ? `?status=${statusFilter.join(",")}` : "";
  const data = await apiFetch<{ parcelOrders: ParcelOrder[] }>(`/api/riders/me/parcel-orders${query}`);
  return data.parcelOrders;
}

/** POST /api/parcel-orders/accept */
export async function acceptParcelOrder(parcelOrderId: string): Promise<ParcelOrder> {
  const data = await apiFetch<{ parcelOrder: ParcelOrder | null }>("/api/parcel-orders/accept", {
    method: "POST",
    body: { parcelOrderId },
  });
  if (!data.parcelOrder) {
    throw new Error("Demande introuvable après acceptation.");
  }
  return data.parcelOrder;
}

/** POST /api/parcel-orders/status */
export async function updateParcelOrderStatus(parcelOrderId: string, status: string): Promise<ParcelOrder> {
  const data = await apiFetch<{ parcelOrder: ParcelOrder }>("/api/parcel-orders/status", {
    method: "POST",
    body: { parcelOrderId, status },
  });
  return data.parcelOrder;
}
