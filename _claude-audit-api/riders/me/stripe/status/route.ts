import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { fetchConnectAccountStatus } from "@/lib/stripeConnect";

/**
 * GET /api/riders/me/stripe/status
 *
 * Équivalent de pros/me/stripe/status, côté livreur.
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.RIDER]);

  const rider = await prisma.rider.findUnique({ where: { userId: auth.userId } });
  if (!rider) {
    throw new ApiError(404, "Profil livreur introuvable.");
  }

  if (!rider.stripeAccountId) {
    return NextResponse.json({ connected: false, chargesEnabled: false, payoutsEnabled: false, onboardingComplete: false });
  }

  const live = await fetchConnectAccountStatus(rider.stripeAccountId);

  if (
    live.chargesEnabled !== rider.stripeChargesEnabled ||
    live.payoutsEnabled !== rider.stripePayoutsEnabled ||
    live.onboardingComplete !== rider.stripeOnboardingComplete
  ) {
    await prisma.rider.update({
      where: { id: rider.id },
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
