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
 * (Stripe.confirmPayment côté mobile) pour finaliser le paiement par carte.
 *
 * Le montant est toujours recalculé depuis order.total stocké en base —
 * jamais depuis une valeur envoyée par le client, pour éviter toute
 * manipulation du prix payé.
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
    // automatic_payment_methods laisse Stripe proposer carte / Apple Pay /
    // Google Pay selon le device, sans configuration supplémentaire.
    automatic_payment_methods: { enabled: true },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: PaymentStatus.AUTHORIZED },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}

export const POST = withErrorHandling(postHandler);
