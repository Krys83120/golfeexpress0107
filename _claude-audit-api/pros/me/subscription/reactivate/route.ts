import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/**
 * POST /api/pros/me/subscription/reactivate
 *
 * Annule une résiliation programmée (cancel_at_period_end) tant que la
 * période payée en cours n'est pas encore terminée — l'abonnement continue
 * normalement et se renouvellera à la prochaine date d'échéance. Une fois
 * la période terminée (webhook customer.subscription.deleted reçu), il n'y
 * a plus rien à réactiver : il faut resouscrire via /subscription/checkout.
 */
async function postHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }
  if (!pro.stripeSubscriptionId) {
    throw new ApiError(400, "Aucun abonnement à réactiver.");
  }

  const subscription = await stripe.subscriptions.update(pro.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  return NextResponse.json({
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    nextRenewalDate: new Date(subscription.current_period_end * 1000).toISOString(),
  });
}

export const POST = withErrorHandling(postHandler);
