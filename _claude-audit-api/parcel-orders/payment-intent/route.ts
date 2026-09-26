import { NextRequest, NextResponse } from "next/server";
import { PaymentStatus } from "@golfeexpress/types";
import { requireProOrEmployee, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/**
 * POST /api/parcel-orders/payment-intent
 *
 * Crée un PaymentIntent Stripe pour une demande Colis Express, sur le même
 * principe que /api/orders/[orderId]/payment-intent : le montant est
 * toujours recalculé depuis parcelOrder.total stocké en base (jamais une
 * valeur envoyée par le client), payment_method_types explicite ["card"]
 * (même raison que sur les commandes -- voir le commentaire équivalent sur
 * orders/[orderId]/payment-intent/route.ts), et la confirmation définitive
 * (paymentStatus -> CAPTURED, status -> CONFIRMED) se fait exclusivement
 * via le webhook Stripe signé (payment_intent.succeeded), jamais depuis ce
 * endpoint ni depuis une réponse fournie par le client.
 *
 * Chemin volontairement à plat (parcel-orders/payment-intent, id transmis
 * dans le corps de la requête) plutôt que parcel-orders/[id]/payment-intent
 * -- cohérent avec parcel-orders/route.ts, voir son commentaire pour le
 * raisonnement.
 *
 * Carte ressaisie à chaque demande (pas de carte enregistrée pour l'instant)
 * -- décision du 19/09/2026, voir la proposition Colis Express envoyée à
 * Krys.
 */
async function postHandler(req: NextRequest) {
  const { proId } = await requireProOrEmployee(req);

  const body = await req.json().catch(() => null);
  const parcelOrderId = typeof body?.parcelOrderId === "string" ? body.parcelOrderId : null;
  if (!parcelOrderId) {
    throw new ApiError(400, "parcelOrderId requis.");
  }

  const parcelOrder = await prisma.parcelOrder.findUnique({ where: { id: parcelOrderId } });
  if (!parcelOrder || parcelOrder.proId !== proId) {
    throw new ApiError(404, "Demande Colis Express introuvable.");
  }
  if (parcelOrder.paymentStatus === PaymentStatus.CAPTURED) {
    throw new ApiError(400, "Cette demande a déjà été payée.");
  }

  // Stripe attend un montant en plus petite unité monétaire (centimes pour EUR).
  const amountInCents = Math.round(Number(parcelOrder.total) * 100);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: "eur",
    metadata: { parcelOrderId: parcelOrder.id, parcelNumber: parcelOrder.parcelNumber, proId },
    payment_method_types: ["card"],
  });

  await prisma.parcelOrder.update({
    where: { id: parcelOrder.id },
    data: { paymentStatus: PaymentStatus.AUTHORIZED, stripePaymentIntentId: paymentIntent.id },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}

export const POST = withErrorHandling(postHandler);
