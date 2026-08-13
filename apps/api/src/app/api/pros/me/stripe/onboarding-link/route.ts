import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { createOrRefreshOnboardingLink } from "@/lib/stripeConnect";

/**
 * POST /api/pros/me/stripe/onboarding-link
 *
 * Génère (ou régénère) un lien d'inscription bancaire Stripe pour le Pro
 * connecté. Le front (FinancesPage) ouvre simplement ce lien dans un
 * nouvel onglet — tout le formulaire (identité, IBAN...) est hébergé et
 * sécurisé par Stripe, jamais par nous.
 */
async function postHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }

  const { url, accountId } = await createOrRefreshOnboardingLink({
    kind: "pro",
    existingAccountId: pro.stripeAccountId,
    email: auth.email,
    businessName: pro.businessName,
  });

  // On enregistre l'accountId dès sa création pour ne jamais en créer un
  // second par erreur si le Pro relance la demande avant d'avoir terminé.
  if (pro.stripeAccountId !== accountId) {
    await prisma.pro.update({ where: { id: pro.id }, data: { stripeAccountId: accountId } });
  }

  return NextResponse.json({ url });
}

export const POST = withErrorHandling(postHandler);
