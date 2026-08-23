import { NextRequest, NextResponse } from "next/server";
import { UserRole, PaymentStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/**
 * POST /api/orders/[orderId]/payment-intent
 *
 * Crée (ou réutilise) un PaymentIntent Stripe pour cette commande et
 * renvoie son `client_secret`, que l'app Client utilise avec le SDK Stripe
 * pour finaliser le paiement par carte.
 *
 * Le montant est toujours recalculé depuis order.total stocké en base —
 * jamais depuis une valeur envoyée par le client, pour éviter toute
 * manipulation du prix payé.
 *
 * payment_method_types: ["card"] plutôt que automatic_payment_methods
 * (23/08/2026) — la résolution automatique de Stripe échoue avec
 * "No valid payment method types for this Payment Intent" tant qu'aucun
 * moyen de paiement n'est explicitement activé dans Dashboard > Paramètres
 * > Payment methods pour le compte concerné (comportement observé au
 * premier test en mode live). Demander "card" explicitement fonctionne
 * indépendamment de cette configuration Dashboard, qui reste par ailleurs
 * à vérifier/étendre séparément si d'autres moyens de paiement (Apple Pay,
 * Google Pay...) doivent être proposés plus tard.
 */
async function postHandler(req: NextRequest, ctx: { params: { orderId: string } }) {
  const auth = await requireAuth(req, [UserRole.CLIENT]);
  const client = await prisma.client.findUnique({ where: { userId: auth.userId } });
  if (!client) {
    throw new ApiError(404, "Profil client introuvable.");
  }
  const order = await prisma.order.findUnique({ where: { id: ctx.params.orderId } });
  if (!order || order.clientId !== client.id) {
    throw new ApiError(404, "Commande introuvable.");
  }
  if (order.paymentStatus === PaymentStatus.CAPTURED) {
    throw new ApiError(400, "Cette commande a déjà été payée.");
  }
  // Stripe attend un montant en plus petite unité monétaire (centimes pour EUR).
  const amountInCents = Math.round(Number(order.total) * 100);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: "eur",
    metadata: { orderId: order.id, orderNumber: order.orderNumber, clientId: client.id },
    payment_method_types: ["card"],
  });
  await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: PaymentStatus.AUTHORIZED },
  });
  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}

export const POST = withErrorHandling(postHandler);
