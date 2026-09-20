import { NextRequest, NextResponse } from "next/server";
import { ParcelOrderStatus, PaymentStatus } from "@golfeexpress/types";
import { requireProOrEmployee, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { updateParcelOrderSchema } from "@/lib/validation/parcelOrders";
import { haversineDistanceKm } from "@/lib/distance";
import { getEffectiveDeliveryFee, getRiderPayForDistance } from "@/lib/pricingSettings";

/**
 * POST /api/parcel-orders/update
 *
 * Modifie une demande Colis Express existante (19/09/2026 -- voir le
 * retour de Krys : le Pro n'avait jusqu'ici aucun moyen de consulter en
 * détail/modifier une demande après sa création).
 *
 * Chemin volontairement à plat (id transmis dans le corps de la requête),
 * même convention que parcel-orders/payment-intent -- voir son commentaire.
 *
 * Modifiable UNIQUEMENT tant que status est PENDING ou CONFIRMED (avant
 * qu'un livreur soit assigné -- au-delà, la course est déjà engagée, la
 * modifier romprait la cohérence avec ce qui a été communiqué au livreur).
 *
 * L'adresse de livraison et le gabarit (`size`) -- les deux champs qui
 * influent sur le tarif -- ne sont modifiables QUE tant que la demande n'est
 * pas encore payée (paymentStatus !== CAPTURED). Une fois le paiement
 * encaissé, seuls recipientName/recipientPhone/instructions restent
 * modifiables : changer l'adresse ou le gabarit changerait le tarif sans
 * pouvoir ajuster rétroactivement le montant déjà prélevé sur la carte.
 * Dans ce cas, la marche à suivre est d'annuler (remboursement automatique,
 * voir parcel-orders/cancel) puis de recréer une nouvelle demande.
 */
function serializeParcelOrder(p: Record<string, unknown>) {
  const fromAddress = p.fromAddress as Record<string, unknown> | null | undefined;
  const toAddress = p.toAddress as Record<string, unknown> | null | undefined;
  return {
    ...p,
    deliveryFee: Number(p.deliveryFee),
    expressFee: Number(p.expressFee),
    total: Number(p.total),
    riderEarnings: Number(p.riderEarnings),
    platformEarnings: Number(p.platformEarnings),
    fromAddress: fromAddress
      ? { ...fromAddress, lat: Number(fromAddress.lat), lng: Number(fromAddress.lng) }
      : fromAddress,
    toAddress: toAddress
      ? { ...toAddress, lat: Number(toAddress.lat), lng: Number(toAddress.lng) }
      : toAddress,
  };
}

const EDITABLE_STATUSES: string[] = [ParcelOrderStatus.PENDING, ParcelOrderStatus.CONFIRMED];

async function postHandler(req: NextRequest) {
  const { proId } = await requireProOrEmployee(req);

  const body = await req.json().catch(() => null);
  const parsed = updateParcelOrderSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }
  const data = parsed.data;

  const parcelOrder = await prisma.parcelOrder.findUnique({
    where: { id: data.parcelOrderId },
    include: { fromAddress: true, toAddress: true },
  });
  if (!parcelOrder || parcelOrder.proId !== proId) {
    throw new ApiError(404, "Demande Colis Express introuvable.");
  }
  if (!EDITABLE_STATUSES.includes(parcelOrder.status)) {
    throw new ApiError(400, "Cette demande ne peut plus être modifiée (livreur déjà assigné ou plus).");
  }

  const wantsPriceChange =
    data.deliveryStreet !== undefined ||
    data.deliveryComplement !== undefined ||
    data.deliveryZipCode !== undefined ||
    data.deliveryCity !== undefined ||
    data.deliveryLat !== undefined ||
    data.deliveryLng !== undefined ||
    data.size !== undefined;

  if (wantsPriceChange && parcelOrder.paymentStatus === PaymentStatus.CAPTURED) {
    throw new ApiError(
      400,
      "Cette demande est déjà payée -- l'adresse et le gabarit ne peuvent plus être modifiés (annulez puis recréez une demande si besoin)."
    );
  }

  const parcelOrderUpdateData: Record<string, unknown> = {};
  if (data.recipientName !== undefined) parcelOrderUpdateData.recipientName = data.recipientName;
  if (data.recipientPhone !== undefined) parcelOrderUpdateData.recipientPhone = data.recipientPhone;
  if (data.instructions !== undefined) parcelOrderUpdateData.instructions = data.instructions;
  // Photo (19/09/2026) -- n'influe pas sur le tarif, donc pas concernée par
  // le blocage wantsPriceChange/CAPTURED ci-dessus, modifiable tant que la
  // demande est encore PENDING/CONFIRMED (voir EDITABLE_STATUSES).
  if (data.photoUrl !== undefined) parcelOrderUpdateData.photoUrl = data.photoUrl;

  if (wantsPriceChange) {
    // Adresse : on met à jour la même ligne Address (orpheline, dédiée à
    // cette demande -- voir parcel-orders/route.ts) plutôt que d'en créer
    // une nouvelle à chaque modification.
    const addressUpdateData: Record<string, unknown> = {};
    if (data.deliveryStreet !== undefined) addressUpdateData.street = data.deliveryStreet;
    if (data.deliveryComplement !== undefined) addressUpdateData.complement = data.deliveryComplement;
    if (data.deliveryZipCode !== undefined) addressUpdateData.zipCode = data.deliveryZipCode;
    if (data.deliveryCity !== undefined) addressUpdateData.city = data.deliveryCity;
    if (data.deliveryLat !== undefined) addressUpdateData.lat = data.deliveryLat;
    if (data.deliveryLng !== undefined) addressUpdateData.lng = data.deliveryLng;

    if (Object.keys(addressUpdateData).length > 0) {
      await prisma.address.update({ where: { id: parcelOrder.toAddressId }, data: addressUpdateData });
    }

    const newLat = data.deliveryLat ?? Number(parcelOrder.toAddress.lat);
    const newLng = data.deliveryLng ?? Number(parcelOrder.toAddress.lng);

    // Même règles de tarification que la création (voir parcel-orders/route.ts)
    // -- recalculées entièrement dès que l'adresse ou le gabarit change,
    // jamais un simple ajustement partiel.
    const distanceKm = haversineDistanceKm(
      Number(parcelOrder.fromAddress.lat),
      Number(parcelOrder.fromAddress.lng),
      newLat,
      newLng
    );
    const deliveryFee = await getEffectiveDeliveryFee(distanceKm, 0);
    const expressFee = Number(parcelOrder.expressFee); // pas encore proposé côté formulaire, voir parcel-orders/route.ts
    const total = deliveryFee + expressFee;
    const riderEarnings = await getRiderPayForDistance(distanceKm);
    const platformEarnings = total - riderEarnings;

    if (data.size !== undefined) parcelOrderUpdateData.size = data.size;
    parcelOrderUpdateData.deliveryFee = deliveryFee;
    parcelOrderUpdateData.total = total;
    parcelOrderUpdateData.riderEarnings = riderEarnings;
    parcelOrderUpdateData.platformEarnings = platformEarnings;
  }

  if (Object.keys(parcelOrderUpdateData).length === 0) {
    throw new ApiError(400, "Aucune modification fournie.");
  }

  const updated = await prisma.parcelOrder.update({
    where: { id: parcelOrder.id },
    data: parcelOrderUpdateData,
    include: {
      fromAddress: true,
      toAddress: true,
      rider: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
    },
  });

  return NextResponse.json({ parcelOrder: serializeParcelOrder(updated) });
}

export const POST = withErrorHandling(postHandler);
