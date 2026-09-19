import { apiFetch } from "@/services/apiClient";
import type { ParcelOrder } from "@golfeexpress/types";
import { ParcelSize } from "@golfeexpress/types";

export interface CreateParcelOrderInput {
  recipientName: string;
  recipientPhone: string;
  deliveryStreet: string;
  deliveryComplement?: string;
  deliveryZipCode: string;
  deliveryCity: string;
  deliveryLat: number;
  deliveryLng: number;
  size: ParcelSize;
  instructions?: string;
}

/** POST /api/parcel-orders */
export async function createParcelOrder(input: CreateParcelOrderInput): Promise<ParcelOrder> {
  const data = await apiFetch<{ parcelOrder: ParcelOrder }>("/api/parcel-orders", {
    method: "POST",
    body: input,
  });
  return data.parcelOrder;
}

/** GET /api/parcel-orders -- demandes de la boutique connectée. */
export async function fetchMyParcelOrders(): Promise<ParcelOrder[]> {
  const data = await apiFetch<{ parcelOrders: ParcelOrder[] }>("/api/parcel-orders");
  return data.parcelOrders;
}

/**
 * POST /api/parcel-orders/payment-intent -- clientSecret Stripe pour payer
 * une demande Colis Express (carte ressaisie à chaque fois, voir
 * ColisExpressPayment.tsx).
 */
export async function createParcelOrderPaymentIntent(parcelOrderId: string): Promise<string> {
  const data = await apiFetch<{ clientSecret: string }>("/api/parcel-orders/payment-intent", {
    method: "POST",
    body: { parcelOrderId },
  });
  return data.clientSecret;
}

/** Body accepté par POST /api/parcel-orders/update -- voir cette route pour les règles. */
export interface UpdateParcelOrderInput {
  parcelOrderId: string;
  recipientName?: string;
  recipientPhone?: string;
  instructions?: string | null;
  deliveryStreet?: string;
  deliveryComplement?: string | null;
  deliveryZipCode?: string;
  deliveryCity?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  size?: ParcelSize;
  /** Photo du colis (19/09/2026) -- URL déjà uploadée, voir uploadParcelOrderPhoto. */
  photoUrl?: string | null;
}

/**
 * POST /api/parcel-orders/update -- modifie une demande existante (voir la
 * route pour les règles : uniquement tant que PENDING/CONFIRMED, adresse et
 * gabarit uniquement tant que non payée).
 */
export async function updateParcelOrder(input: UpdateParcelOrderInput): Promise<ParcelOrder> {
  const data = await apiFetch<{ parcelOrder: ParcelOrder }>("/api/parcel-orders/update", {
    method: "POST",
    body: input,
  });
  return data.parcelOrder;
}

/**
 * POST /api/parcel-orders/cancel -- annule une demande (remboursement Stripe
 * automatique si déjà payée, voir la route). Tant que le colis n'a pas
 * encore été récupéré par le livreur.
 */
export async function cancelParcelOrder(parcelOrderId: string): Promise<ParcelOrder> {
  const data = await apiFetch<{ parcelOrder: ParcelOrder }>("/api/parcel-orders/cancel", {
    method: "POST",
    body: { parcelOrderId },
  });
  return data.parcelOrder;
}

/**
 * DELETE /api/parcel-orders -- supprime définitivement une demande annulée
 * (19/09/2026, retour de Krys : les demandes annulées ne servent qu'à
 * surcharger la liste "Demandes récentes"). Réservé aux demandes déjà
 * CANCELLED -- voir la route pour la règle exacte.
 */
export async function deleteParcelOrder(parcelOrderId: string): Promise<void> {
  await apiFetch<{ ok: true }>("/api/parcel-orders", {
    method: "DELETE",
    body: { parcelOrderId },
  });
}

/**
 * Géocodage adresse texte -> lat/lng, même API publique et gratuite que côté
 * Client (voir apps/client/src/components/AddAddressForm.tsx) -- résolu ici
 * plutôt que côté serveur, pour rester cohérent avec le reste de l'app.
 */
export async function geocodeAddress(
  street: string,
  zipCode: string,
  city: string
): Promise<{ lat: number; lng: number } | null> {
  const params = new URLSearchParams({ q: `${street} ${city}`.trim(), limit: "1" });
  if (zipCode) params.set("postcode", zipCode);

  const response = await fetch(`https://api-adresse.data.gouv.fr/search/?${params.toString()}`);
  const data = await response.json();
  const feature = data?.features?.[0];
  if (!feature?.geometry?.coordinates) return null;

  const [lng, lat] = feature.geometry.coordinates;
  return { lat, lng };
}
