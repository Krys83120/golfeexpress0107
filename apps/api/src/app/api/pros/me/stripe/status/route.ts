import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { fetchConnectAccountStatus } from "@/lib/stripeConnect";

/**
 * GET /api/pros/me/stripe/status
 *
 * Statut de configuration bancaire du Pro. On relit toujours en direct
 * depuis Stripe (pas seulement les flags en base) pour refléter
 * immédiatement un onboarding tout juste terminé, même si le webhook
 * account.updated n'est pas encore arrivé.
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }

  if (!pro.stripeAccountId) {
    return NextResponse.json({ connected: false, chargesEnabled: false, payoutsEnabled: false, onboardingComplete: false });
  }

  const live = await fetchConnectAccountStatus(pro.stripeAccountId);

  // On resynchronise la base au passage — évite d'attendre le prochain
  // webhook si les flags avaient divergé.
  if (
    live.chargesEnabled !== pro.stripeChargesEnabled ||
    live.payoutsEnabled !== pro.stripePayoutsEnabled ||
    live.onboardingComplete !== pro.stripeOnboardingComplete
  ) {
    await prisma.pro.update({
      where: { id: pro.id },
      data: {
        stripeChargesEnabled: live.chargesEnabled,
        stripePayoutsEnabled: live.payoutsEnabled,
        stripeOnboardingComplete: live.onboardingComplete,
      },
    });
  }

  return NextResponse.json({ connected: true, ...live });
}

export const GET = withErrorHandling(getHandler);
