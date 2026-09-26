import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/riders/me/reviews
 *
 * Liste les avis (Review) laissés sur les livraisons du livreur connecté,
 * du plus récent au plus ancien — miroir de GET /api/pros/me/reviews côté
 * Pro. N'inclut que les avis visibles (isVisible=true) et qui portent
 * effectivement une note livreur (riderRating non nul) : un avis peut
 * référencer le rider de la commande sans que le client ait spécifiquement
 * noté la livraison (riderRating optionnel, voir model Review).
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.RIDER]);

  const rider = await prisma.rider.findUnique({ where: { userId: auth.userId } });
  if (!rider) {
    throw new ApiError(404, "Profil livreur introuvable.");
  }

  const reviews = await prisma.review.findMany({
    where: { riderId: rider.id, isVisible: true, riderRating: { not: null } },
    include: { client: { select: { user: { select: { firstName: true, lastName: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ reviews });
}

export const GET = withErrorHandling(getHandler);
