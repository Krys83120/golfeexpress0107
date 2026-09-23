import { NextRequest, NextResponse } from "next/server";
import { ParcelOrderStatus, PaymentStatus } from "@golfeexpress/types";
import { requireProOrEmployee, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { createParcelOrderSchema, deleteParcelOrderSchema } from "@/lib/validation/parcelOrders";
import { haversineDistanceKm } from "@/lib/distance";
import { getEffectiveDeliveryFee, getRiderPayForDistance } from "@/lib/pricingSettings";

/**
 * Colis Express -- MVP (19/09/2026), réservé à l'espace Pro pour l'instant
 * (voir la proposition envoyée à Krys et sa décision sur le périmètre).
 * Table séparée de Order/OrderItem, voir model ParcelOrder dans
 * prisma/schema.prisma pour le raisonnement complet.
 *
 * Ce que cette route fait DÉJÀ : crée la demande, calcule le tarif (mêmes
 * règles de frais de livraison par distance que les commandes classiques,
 * voir pricingSettings.ts), et la rémunération livreur associée.
 *
 * Ce qu'elle NE fait PAS ENCORE (étapes suivantes, volontairement séparées) :
 *  - Débiter le Pro via Stripe (paymentStatus reste PENDING) -- à câbler une
 *    fois vérifié qu'un moyen de paiement par défaut existe sur
 *    Pro.stripeCustomerId.
 *  - Rendre la course visible aux livreurs ("commandes disponibles") -- ne
 *    doit se déclencher qu'une fois le paiement confirmé (status
 *    CONFIRMED), pour ne jamais envoyer un livreur chercher un colis dont le
 *    paiement pourrait échouer.
 */
const EXPRESS_FEE = 0; // Pas encore proposé côté formulaire -- voir schema.prisma, champ conservé pour plus tard.

/**
 * deliveryFee/expressFee/total/riderEarnings/platformEarnings (et lat/lng
 * des adresses liées) sont des Decimal Prisma -- sérialisés en nombre pour
 * le client, comme rider.currentLat/currentLng dans orders/route.ts (sinon
 * ils arrivent en chaîne de caractères côté client, et un `.toFixed()` y
 * plante silencieusement tout l'écran -- voir le bug remonté le 19/09/2026).
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

/**
 * POST /api/parcel-orders
 *
 * Crée une demande de Colis Express pour la boutique du Pro (ou employé)
 * connecté. Body: voir createParcelOrderSchema.
 */
async function postHandler(req: NextRequest) {
  const { proId } = await requireProOrEmployee(req);

  const pro = await prisma.pro.findUnique({ where: { id: proId } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }
  if (!pro.pickupAddressId) {
    throw new ApiError(
      400,
      "Aucune adresse de boutique configurée -- ajoutez d'abord une adresse depuis Réglages avant de demander un Colis Express."
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = createParcelOrderSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }
  const data = parsed.data;

  const fromAddress = await prisma.address.findUnique({ where: { id: pro.pickupAddressId } });
  if (!fromAddress) {
    throw new ApiError(400, "Adresse de retrait de la boutique introuvable.");
  }

  // Adresse de livraison -- pas de compte destinataire, donc une Address
  // "orpheline" (userId et proId tous deux null), jamais listée dans un
  // carnet d'adresses existant (ceux-ci filtrent toujours par userId/proId,
  // voir AddressPickerScreen.tsx côté Client). Créée à chaque demande plutôt
  // que réutilisée -- volume négligeable pour ce MVP.
  const toAddress = await prisma.address.create({
    data: {
      label: "Destinataire Colis Express",
      street: data.deliveryStreet,
      complement: data.deliveryComplement ?? null,
      zipCode: data.deliveryZipCode,
      city: data.deliveryCity,
      lat: data.deliveryLat,
      lng: data.deliveryLng,
      isDefault: false,
    },
  });

  const distanceKm = haversineDistanceKm(
    Number(fromAddress.lat),
    Number(fromAddress.lng),
    data.deliveryLat,
    data.deliveryLng
  );

  // Mêmes règles de tarification que les commandes classiques (voir
  // pricingSettings.ts) -- subtotal=0 puisqu'il n'y a pas de panier, ce qui
  // désactive naturellement la livraison gratuite au-dessus d'un panier pour
  // Colis Express (comportement voulu : pas de panier à faire grossir ici).
  const deliveryFee = await getEffectiveDeliveryFee(distanceKm, 0);
  const expressFee = EXPRESS_FEE;
  const total = deliveryFee + expressFee;
  const riderEarnings = await getRiderPayForDistance(distanceKm);
  const platformEarnings = total - riderEarnings;

  const parcelNumber = `CO-${Date.now().toString().slice(-8)}`;

  const parcelOrder = await prisma.parcelOrder.create({
    data: {
      parcelNumber,
      proId,
      fromAddressId: fromAddress.id,
      toAddressId: toAddress.id,
      recipientName: data.recipientName,
      recipientPhone: data.recipientPhone,
      size: data.size,
      instructions: data.instructions ?? null,
      status: ParcelOrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      deliveryFee,
      expressFee,
      total,
      riderEarnings,
      platformEarnings,
    },
    include: { fromAddress: true, toAddress: true },
  });

  return NextResponse.json({ parcelOrder: serializeParcelOrder(parcelOrder) }, { status: 201 });
}

/**
 * GET /api/parcel-orders
 *
 * Liste les demandes Colis Express de la boutique du Pro (ou employé)
 * connecté. Volontairement réservé au rôle Pro pour ce MVP -- la vue
 * Livreur ("commandes disponibles") et la vue Admin viendront avec les
 * étapes suivantes (paiement, intégration Livreur), pas encore branchées.
 */
async function getHandler(req: NextRequest) {
  const { proId } = await requireProOrEmployee(req);

  const parcelOrders = await prisma.parcelOrder.findMany({
    where: { proId },
    include: {
      fromAddress: true,
      toAddress: true,
      // currentLat/currentLng/vehicleType (23/09/2026 -- finition du
      // workflow Livreur) : permet au Pro de suivre en direct où en est son
      // colis une fois un livreur assigné, en réutilisant tel quel le suivi
      // GPS déjà alimenté par riders/me/location (même position que celle
      // utilisée pour le suivi des commandes classiques, voir orders/route.ts).
      rider: {
        select: {
          id: true,
          currentLat: true,
          currentLng: true,
          vehicleType: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { placedAt: "desc" },
    take: 100,
  });

  // rider.currentLat/currentLng sont des Decimal Prisma -> sérialisés en
  // texte par défaut en JSON, même correctif que orders/route.ts (GET) pour
  // que la carte de suivi côté Pro puisse les utiliser directement.
  const serialized = parcelOrders.map((p) => ({
    ...serializeParcelOrder(p),
    rider: p.rider
      ? {
          ...p.rider,
          currentLat: p.rider.currentLat !== null ? Number(p.rider.currentLat) : null,
          currentLng: p.rider.currentLng !== null ? Number(p.rider.currentLng) : null,
        }
      : null,
  }));

  return NextResponse.json({ parcelOrders: serialized });
}

/**
 * DELETE /api/parcel-orders
 *
 * Supprime définitivement une demande Colis Express (19/09/2026 -- retour
 * de Krys : les demandes annulées s'accumulaient inutilement dans la liste
 * "Demandes récentes", aussi bien côté Pro qu'Admin, voir la route jumelle
 * admin/parcel-orders/route.ts). Ajouté ici plutôt que dans un nouveau
 * sous-dossier /delete (contrairement à /cancel, /update...) : simple choix
 * pratique, pas de raison métier -- même fichier que POST/GET ci-dessus,
 * body transmis en DELETE (voir deleteParcelOrder côté client) comme pour
 * les autres actions Colis Express.
 *
 * Volontairement restreint aux demandes déjà CANCELLED, imposé côté
 * serveur (jamais fait confiance à ce que le client envoie) : une demande
 * encore active ne doit jamais pouvoir être supprimée directement -- elle
 * doit d'abord être annulée (voir parcel-orders/cancel, qui gère déjà le
 * remboursement Stripe le cas échéant). Une fois CANCELLED, plus aucun flux
 * d'argent n'est en jeu, la suppression ne touche donc jamais Stripe.
 *
 * Supprime aussi l'adresse de livraison associée (toAddress) : une ligne
 * Address "orpheline" créée spécifiquement pour cette demande (voir
 * postHandler ci-dessus), jamais partagée ni réutilisée ailleurs --
 * contrairement à fromAddress (l'adresse boutique du Pro, partagée par
 * toutes ses demandes), qui n'est jamais touchée ici.
 */
async function deleteHandler(req: NextRequest) {
  const { proId } = await requireProOrEmployee(req);

  const body = await req.json().catch(() => null);
  const parsed = deleteParcelOrderSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const parcelOrder = await prisma.parcelOrder.findUnique({ where: { id: parsed.data.parcelOrderId } });
  if (!parcelOrder || parcelOrder.proId !== proId) {
    throw new ApiError(404, "Demande Colis Express introuvable.");
  }
  if (parcelOrder.status !== ParcelOrderStatus.CANCELLED) {
    throw new ApiError(400, "Seule une demande annulée peut être supprimée.");
  }

  await prisma.parcelOrder.delete({ where: { id: parcelOrder.id } });
  // Best-effort : ne bloque jamais la suppression de la demande elle-même
  // si l'adresse a déjà disparu ou ne peut pas être supprimée pour une
  // raison quelconque.
  await prisma.address.delete({ where: { id: parcelOrder.toAddressId } }).catch(() => {});

  return NextResponse.json({ ok: true });
}

export const POST = withErrorHandling(postHandler);
export const GET = withErrorHandling(getHandler);
export const DELETE = withErrorHandling(deleteHandler);
