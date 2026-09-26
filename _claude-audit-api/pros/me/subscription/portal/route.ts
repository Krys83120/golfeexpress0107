import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

const PRO_APP_URL = process.env.STRIPE_CONNECT_RETURN_URL_PRO ?? "https://pro.doyougeckoo.fr";

/**
 * POST /api/pros/me/subscription/portal
 *
 * Ouvre le Billing Portal Stripe (hébergé par Stripe) pour que le Pro gère
 * lui-même son abonnement en cours : changer de carte, voir ses factures,
 * résilier. On ne construit jamais nous-mêmes un formulaire de résiliation
 * — le webhook `customer.subscription.deleted` se charge de repasser le
 * Pro en FREE dès que Stripe confirme la résiliation.
 */
async function postHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }
  if (!pro.stripeCustomerId) {
    throw new ApiError(400, "Aucun abonnement en cours — souscrivez d'abord à un pack payant.");
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: pro.stripeCustomerId,
    return_url: `${PRO_APP_URL}/?subscription=portal-return`,
  });

  return NextResponse.json({ url: portalSession.url });
}

export const POST = withErrorHandling(postHandler);
