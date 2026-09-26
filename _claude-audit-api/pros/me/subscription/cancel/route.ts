import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/**
 * POST /api/pros/me/subscription/cancel
 *
 * Programme la résiliation en fin de période payée en cours — jamais de
 * coupure immédiate : le Pro garde son pack jusqu'à `current_period_end`
 * puisque le mois en cours est déjà payé. C'est un appel direct à l'API
 * Stripe (pas un redirect vers le Billing Portal) pour donner un retour
 * immédiat côté UI ; la mise à jour en base et l'email de confirmation sont
 * gérés par le webhook `customer.subscription.updated` qui suit (voir
 * webhooks/stripe/route.ts) — reste la seule source de vérité pour l'état
 * persisté, cette route ne fait qu'aller chercher la confirmation Stripe
 * pour affichage instantané.
 */
async function postHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }
  if (!pro.stripeSubscriptionId) {
    throw new ApiError(400, "Aucun abonnement payant en cours à résilier.");
  }

  const subscription = await stripe.subscriptions.update(pro.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  return NextResponse.json({
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    effectiveDate: new Date(subscription.current_period_end * 1000).toISOString(),
  });
}

export const POST = withErrorHandling(postHandler);
