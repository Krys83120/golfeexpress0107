import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/pros/me/reviews
 *
 * Avis clients laissés sur le commerçant connecté, du plus récent au plus
 * ancien. Ne renvoie que les avis visibles (isVisible=true) qui portent
 * effectivement une note commerçant (proRating non nul) -- une ligne
 * Review peut exister pour cette commande sans que le client ait
 * spécifiquement noté le commerçant (proRating optionnel, voir model
 * Review) si l'avis ne portait que sur le livreur ou la plateforme.
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }

  const reviews = await prisma.review.findMany({
    where: { proId: pro.id, isVisible: true, proRating: { not: null } },
    include: { client: { select: { user: { select: { firstName: true, lastName: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ reviews });
}

export const GET = withErrorHandling(getHandler);
