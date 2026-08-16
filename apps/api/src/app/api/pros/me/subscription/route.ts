import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { getPublicPacks } from "@/lib/partnerPacks";

/**
 * GET /api/pros/me/subscription
 *
 * État d'abonnement du Pro connecté (pack actuel, statut Stripe brut,
 * date d'expiration) + la liste des packs publics disponibles — alimente
 * l'écran "Abonnement" côté apps/pro (cartes de packs + mise en avant du
 * pack actuel + bouton gérer/résilier si un abonnement payant est actif).
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const pro = await prisma.pro.findUnique({
    where: { userId: auth.userId },
    select: {
      subscriptionType: true,
      subscriptionExpiry: true,
      subscriptionStatus: true,
      commissionRate: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }

  const packs = await getPublicPacks();

  return NextResponse.json({
    subscription: {
      tier: pro.subscriptionType,
      expiry: pro.subscriptionExpiry,
      status: pro.subscriptionStatus,
      commissionRate: Number(pro.commissionRate),
      // hasBillingAccount : true dès qu'un Customer Stripe existe, même si
      // le Pro est repassé en FREE depuis — sert côté UI à savoir si le
      // bouton "Gérer mon abonnement" (Billing Portal) doit être affiché.
      hasBillingAccount: Boolean(pro.stripeCustomerId),
      hasActiveSubscription: Boolean(pro.stripeSubscriptionId),
    },
    packs,
  });
}

export const GET = withErrorHandling(getHandler);
