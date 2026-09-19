import { apiFetch } from "@/services/apiClient";
import type { ParcelOrder, User } from "@golfeexpress/types";

/**
 * Client API Admin pour Colis Express (19/09/2026) -- dernier volet du
 * chantier demandé par Krys : vue d'ensemble de toutes les demandes,
 * réassigner/annuler une course, marquer payé manuellement. Fichier séparé
 * de adminEntitiesApi.ts plutôt qu'ajouté dedans : Colis Express est un
 * domaine à part entière (pas une facette Pro/Rider/User existante), même
 * raisonnement que orderStatusLabels.ts/ordersApi.ts qui vivent hors de
 * adminEntitiesApi.ts pour les commandes classiques.
 */
export interface AdminParcelOrderRow extends Omit<ParcelOrder, "pro" | "rider"> {
  pro: { id: string; businessName: string } | null;
  rider: { id: string; user: Pick<User, "firstName" | "lastName"> } | null;
}

/** GET /api/admin/parcel-orders -- toutes boutiques confondues, 500 demandes les plus récentes. */
export async function fetchAdminParcelOrders(): Promise<AdminParcelOrderRow[]> {
  const data = await apiFetch<{ parcelOrders: AdminParcelOrderRow[] }>("/api/admin/parcel-orders");
  return data.parcelOrders;
}

/** POST /api/admin/parcel-orders/reassign -- riderId=null retire le livreur assigné. */
export async function reassignAdminParcelOrder(
  parcelOrderId: string,
  riderId: string | null
): Promise<AdminParcelOrderRow> {
  const data = await apiFetch<{ parcelOrder: AdminParcelOrderRow }>("/api/admin/parcel-orders/reassign", {
    method: "POST",
    body: { parcelOrderId, riderId },
  });
  return data.parcelOrder;
}

/** POST /api/admin/parcel-orders/cancel */
export async function cancelAdminParcelOrder(parcelOrderId: string): Promise<AdminParcelOrderRow> {
  const data = await apiFetch<{ parcelOrder: AdminParcelOrderRow }>("/api/admin/parcel-orders/cancel", {
    method: "POST",
    body: { parcelOrderId },
  });
  return data.parcelOrder;
}

/** POST /api/admin/parcel-orders/mark-paid -- dépannage paiement (webhook Stripe non reçu, règlement par un autre moyen...). */
export async function markPaidAdminParcelOrder(parcelOrderId: string): Promise<AdminParcelOrderRow> {
  const data = await apiFetch<{ parcelOrder: AdminParcelOrderRow }>("/api/admin/parcel-orders/mark-paid", {
    method: "POST",
    body: { parcelOrderId },
  });
  return data.parcelOrder;
}

/**
 * DELETE /api/admin/parcel-orders -- supprime définitivement une demande
 * annulée, tous commerçants confondus (19/09/2026, retour de Krys : les
 * demandes annulées ne servent qu'à surcharger la vue Admin). Réservé aux
 * demandes déjà CANCELLED -- voir la route pour la règle exacte.
 */
export async function deleteAdminParcelOrder(parcelOrderId: string): Promise<void> {
  await apiFetch<{ ok: true }>("/api/admin/parcel-orders", {
    method: "DELETE",
    body: { parcelOrderId },
  });
}
