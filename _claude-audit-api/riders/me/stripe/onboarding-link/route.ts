import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { createOrRefreshOnboardingLink } from "@/lib/stripeConnect";

/**
 * POST /api/riders/me/stripe/onboarding-link
 *
 * Équivalent de pros/me/stripe/onboarding-link, côté livreur. Voir ce
 * fichier pour le détail — logique strictement identique.
 */
async function postHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.RIDER]);

  const rider = await prisma.rider.findUnique({ where: { userId: auth.userId } });
  if (!rider) {
    throw new ApiError(404, "Profil livreur introuvable.");
  }

  const { url, accountId } = await createOrRefreshOnboardingLink({
    kind: "rider",
    existingAccountId: rider.stripeAccountId,
    email: auth.email,
  });

  if (rider.stripeAccountId !== accountId) {
    await prisma.rider.update({ where: { id: rider.id }, data: { stripeAccountId: accountId } });
  }

  return NextResponse.json({ url });
}

export const POST = withErrorHandling(postHandler);
