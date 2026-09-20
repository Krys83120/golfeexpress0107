import { NextRequest, NextResponse } from "next/server";
import { ParcelOrderStatus, PaymentStatus } from "@golfeexpress/types";
import { requireProOrEmployee, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { cancelParcelOrderSchema } from "@/lib/validation/parcelOrders";

/**
 * POST /api/parcel-orders/cancel
 *
 * Annule une demande Colis Express (19/09/2026 -- voir le retour de Krys :
 * le Pro n'avait jusqu'ici aucun moyen de supprimer/annuler une demande).
 * Chemin à plat, même convention que le reste de Colis Express.
 *
 * Annulable tant que le colis n'a pas encore été récupéré par le livreur
 * (status PENDING, CONFIRMED ou RIDER_ASSIGNED) -- au-delà (PICKED_UP,
 * IN_DELIVERY, DELIVERED), le livreur a déjà le colis en main, une
 * annulation en libre-service n'a plus de sens (contact direct nécessaire).
 * Une demande déjà CANCELLED ne peut évidemment pas l'être une deuxième fois.
 *
 * Remboursement :
 *  - Paiement déjà encaissé (paymentStatus CAPTURED) -> remboursement Stripe
 *    intégral automatique, paymentStatus passe à REFUNDED.
 *  - Paiement créé mais pas encore confirmé (AUTHORIZED) -> on annule
 *    simplement le PaymentIntent Stripe (best-effort, un échec ici -- par ex.
 *    intent déjà expiré côté Stripe -- ne bloque jamais l'annulation de la
 *    demande elle-même) ; rien n'a été prélevé, pas de remboursement à faire.
 */
const CANCELLABLE_STATUSES: string[] = [
  ParcelOrderStatus.PENDING,
  ParcelOrderStatus.CONFIRMED,
  ParcelOrderStatus.RIDER_ASSIGNED,
];

async function postHandler(req: NextRequest) {
  const { proId } = await requireProOrEmployee(req);

  const body = await req.json().catch(() => null);
  const parsed = cancelParcelOrderSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const parcelOrder = await prisma.parcelOrder.findUnique({ where: { id: parsed.data.parcelOrderId } });
  if (!parcelOrder || parcelOrder.proId !== proId) {
    throw new ApiError(404, "Demande Colis Express introuvable.");
  }
  if (!CANCELLABLE_STATUSES.includes(parcelOrder.status)) {
    throw new ApiError(400, "Cette demande ne peut plus être annulée (colis déjà récupéré ou livré).");
  }

  let paymentStatus = parcelOrder.paymentStatus;

  if (parcelOrder.paymentStatus === PaymentStatus.CAPTURED) {
    if (!parcelOrder.stripePaymentIntentId) {
      // Ne devrait jamais arriver (CAPTURED est toujours posé en même temps
      // que stripePaymentIntentId, voir webhooks/stripe/route.ts) -- garde-fou.
      throw new ApiError(500, "Paiement marqué comme encaissé mais aucune référence Stripe -- contactez le support.");
    }
    try {
      await stripe.refunds.create({ payment_intent: parcelOrder.stripePaymentIntentId });
      paymentStatus = PaymentStatus.REFUNDED;
    } catch (err) {
      console.error(`[parcel-orders/cancel] Échec remboursement Stripe (${parcelOrder.id}):`, err);
      throw new ApiError(500, "Échec du remboursement -- réessayez dans quelques instants ou contactez le support.");
    }
  } else if (parcelOrder.stripePaymentIntentId) {
    try {
      await stripe.paymentIntents.cancel(parcelOrder.stripePaymentIntentId);
    } catch (err) {
      console.error(`[parcel-orders/cancel] Annulation PaymentIntent best-effort échouée (${parcelOrder.id}):`, err);
    }
  }

  const updated = await prisma.parcelOrder.update({
    where: { id: parcelOrder.id },
    data: {
      status: ParcelOrderStatus.CANCELLED,
      cancelledAt: new Date(),
      paymentStatus,
    },
    include: {
      fromAddress: true,
      toAddress: true,
      rider: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
    },
  });

  return NextResponse.json({
    parcelOrder: {
      ...updated,
      deliveryFee: Number(updated.deliveryFee),
      expressFee: Number(updated.expressFee),
      total: Number(updated.total),
      riderEarnings: Number(updated.riderEarnings),
      platformEarnings: Number(updated.platformEarnings),
      fromAddress: updated.fromAddress
        ? { ...updated.fromAddress, lat: Number(updated.fromAddress.lat), lng: Number(updated.fromAddress.lng) }
        : updated.fromAddress,
      toAddress: updated.toAddress
        ? { ...updated.toAddress, lat: Number(updated.toAddress.lat), lng: Number(updated.toAddress.lng) }
        : updated.toAddress,
    },
  });
}

export const POST = withErrorHandling(postHandler);
