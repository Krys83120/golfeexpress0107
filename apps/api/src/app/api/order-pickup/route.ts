import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";
import { haversineDistanceKm } from "@/lib/distance";
import {
  PICKUP_MAX_DISTANCE_KM,
  PICKUP_RIDER_LOCATION_MAX_AGE_MS,
  pickupCodesMatch,
  sanitizeOrderForRole,
} from "@/lib/pickupCode";
// On réutilise TELLE QUELLE la route de changement de statut (emails client
// "en route", horodatages, compte à rebours de livraison, historique...) au
// lieu de dupliquer sa logique : le scan ne fait que PROUVER la remise, puis
// déclenche exactement les mêmes transitions que le faisait le bouton manuel.
import { PATCH as patchOrderStatus } from "@/app/api/orders/[orderId]/status/route";

/**
 * POST /api/order-pickup
 *
 * Un livreur valide la récupération d'une commande en scannant le QR code
 * imprimé sur le ticket du Pro (ou en saisissant le code à 6 chiffres qui
 * l'accompagne) -- voir lib/pickupCode.ts pour le contexte (fraude "le
 * livreur part avec le sac sans valider la récupération").
 *
 * Body: { orderId: string, code: string, lat?: number, lng?: number }
 *
 * Vérifie, dans l'ordre :
 *  1. que la commande est bien assignée à CE livreur et en RIDER_ASSIGNED ;
 *  2. que le Pro l'a marquée prête (readyAt) ;
 *  3. que le code correspond (comparaison en temps constant, 10 essais max
 *     par tranche de 10 minutes) ;
 *  4. que le livreur est à moins de PICKUP_MAX_DISTANCE_KM du commerçant,
 *     d'après la position envoyée avec le scan, à défaut sa dernière position
 *     connue si elle est récente (si aucune position n'est disponible, le
 *     scan reste accepté plutôt que de bloquer un livreur au GPS capricieux).
 * Puis enregistre Order.pickupVerifiedAt et enchaîne RIDER_ASSIGNED ->
 * PICKED_UP -> IN_DELIVERY via la route de statut.
 *
 * Réponse : { order } (sans deliveryCode ni pickupCode, voir
 * sanitizeOrderForRole).
 */
const ORDER_RESPONSE_INCLUDE = {
  items: true,
  statusHistory: { orderBy: { changedAt: "asc" as const } },
  client: { select: { id: true, user: { select: { firstName: true, lastName: true, phone: true } } } },
  pro: { select: { id: true, businessName: true, logo: true, category: true } },
  fromAddress: true,
  toAddress: true,
};

function isValidCoordinate(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

async function postHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.RIDER]);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    throw new ApiError(400, "Corps de requête invalide.");
  }
  const { orderId, code, lat, lng } = body as { orderId?: unknown; code?: unknown; lat?: unknown; lng?: unknown };

  if (typeof orderId !== "string" || !orderId) {
    throw new ApiError(400, "orderId requis.");
  }
  const cleanedCode = typeof code === "string" ? code.replace(/\s+/g, "") : "";
  if (!/^\d{6}$/.test(cleanedCode)) {
    throw new ApiError(400, "Code invalide : 6 chiffres attendus.");
  }

  // Frein au bourrinage du code (1 000 000 combinaisons) : 10 essais par
  // tranche de 10 minutes, par commande et par IP.
  await enforceRateLimit(req, { route: `order-pickup:${orderId}`, limit: 10, windowMs: 10 * 60 * 1000 });

  const rider = await prisma.rider.findUnique({ where: { userId: auth.userId } });
  if (!rider) {
    throw new ApiError(404, "Profil livreur introuvable.");
  }

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { fromAddress: true } });
  if (!order) {
    throw new ApiError(404, "Commande introuvable.");
  }
  if (order.riderId !== rider.id) {
    throw new ApiError(403, "Cette commande ne vous est pas assignée.");
  }
  if (!order.pickupCode) {
    // Commande créée avant le déploiement du QR : pas de code de référence,
    // l'ancien bouton manuel reste le seul chemin (voir
    // assertPickupVerifiedForRider, qui ne bloque pas ce cas non plus).
    throw new ApiError(
      409,
      "Cette commande n'utilise pas le QR de remise : utilisez le bouton « J'ai récupéré la commande »."
    );
  }

  // Scan rejoué (double appui, réseau qui a répondu trop tard...) alors que la
  // récupération est déjà validée : on renvoie simplement l'état actuel.
  if (
    order.pickupVerifiedAt &&
    (order.status === OrderStatus.PICKED_UP || order.status === OrderStatus.IN_DELIVERY)
  ) {
    const current = await prisma.order.findUnique({ where: { id: order.id }, include: ORDER_RESPONSE_INCLUDE });
    return NextResponse.json({ order: current ? sanitizeOrderForRole(current, auth.role) : current });
  }

  if (order.status !== OrderStatus.RIDER_ASSIGNED) {
    throw new ApiError(409, "Cette commande ne peut pas être récupérée dans son état actuel.");
  }
  if (!order.readyAt) {
    throw new ApiError(409, "Le commerçant n'a pas encore marqué la commande comme prête.");
  }

  if (!pickupCodesMatch(order.pickupCode, cleanedCode)) {
    throw new ApiError(403, "Code incorrect. Scannez le QR du ticket, ou vérifiez les 6 chiffres.");
  }

  // Présence chez le commerçant. Position envoyée avec le scan en priorité ;
  // sinon dernière position connue, seulement si elle est récente.
  let riderPosition: { lat: number; lng: number } | null = null;
  if (isValidCoordinate(lat, lng)) {
    riderPosition = { lat, lng: lng as number };
  } else if (
    rider.currentLat !== null &&
    rider.currentLng !== null &&
    rider.currentLocationUpdatedAt &&
    Date.now() - rider.currentLocationUpdatedAt.getTime() <= PICKUP_RIDER_LOCATION_MAX_AGE_MS
  ) {
    riderPosition = { lat: Number(rider.currentLat), lng: Number(rider.currentLng) };
  }
  const shopLat = Number(order.fromAddress.lat);
  const shopLng = Number(order.fromAddress.lng);
  if (riderPosition && Number.isFinite(shopLat) && Number.isFinite(shopLng)) {
    const distanceKm = haversineDistanceKm(riderPosition.lat, riderPosition.lng, shopLat, shopLng);
    if (distanceKm > PICKUP_MAX_DISTANCE_KM) {
      throw new ApiError(
        403,
        `Vous semblez être à ${Math.round(distanceKm * 1000)} m du commerçant. Scannez le QR une fois sur place.`
      );
    }
  }

  // Preuve enregistrée AVANT les transitions : c'est elle que le garde-fou de
  // la route de statut (assertPickupVerifiedForRider) vérifie.
  await prisma.order.updateMany({
    where: { id: order.id, riderId: rider.id, pickupVerifiedAt: null },
    data: { pickupVerifiedAt: new Date() },
  });

  // Appelle la route de statut comme le ferait l'app : mêmes en-têtes
  // (donc même authentification Bearer), nouveau corps.
  async function moveTo(status: OrderStatus) {
    const headers = new Headers(req.headers);
    headers.delete("content-length");
    headers.set("content-type", "application/json");
    const statusRequest = new NextRequest(new URL(`/api/orders/${order!.id}/status`, req.url), {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status }),
    });
    const response = await patchOrderStatus(statusRequest, { params: { orderId: order!.id } });
    const payload = (await response.json().catch(() => null)) as { order?: Record<string, unknown>; error?: string } | null;
    return { ok: response.ok, status: response.status, payload };
  }

  const pickedUp = await moveTo(OrderStatus.PICKED_UP);
  if (!pickedUp.ok || !pickedUp.payload?.order) {
    throw new ApiError(pickedUp.status, pickedUp.payload?.error ?? "Impossible de valider la récupération pour le moment.");
  }

  // Passage automatique en "livraison en cours". Si cette 2e étape échoue, la
  // récupération est de toute façon validée (PICKED_UP) : l'app Livreur
  // propose alors l'étape "J'arrive chez le client" comme avant.
  const inDelivery = await moveTo(OrderStatus.IN_DELIVERY);
  const finalOrder = inDelivery.ok && inDelivery.payload?.order ? inDelivery.payload.order : pickedUp.payload.order;

  return NextResponse.json({
    order: sanitizeOrderForRole(finalOrder as { deliveryCode?: string | null; pickupCode?: string | null }, auth.role),
  });
}

export const POST = withErrorHandling(postHandler);
