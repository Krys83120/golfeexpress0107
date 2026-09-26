import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/pros/[proId]/reviews
 *
 * Avis clients visibles pour un commerçant donné — route PUBLIQUE (pas
 * d'authentification requise, comme GET /api/pros et GET /api/pros/[proId]/products) :
 * alimente la fiche commerçant côté app Client (avant connexion/commande)
 * et côté site vitrine public (visiteurs non connectés). La moyenne
 * (Pro.rating/ratingCount) est déjà renvoyée par GET /api/pros — cette
 * route ajoute le détail (commentaires) derrière cette moyenne.
 *
 * Miroir de GET /api/pros/me/reviews (côté Pro connecté), mais public et
 * paramétré par proId au lieu de dériver le Pro depuis l'utilisateur
 * authentifié.
 */
async function getHandler(_req: NextRequest, { params }: { params: { proId: string } }) {
  const reviews = await prisma.review.findMany({
    where: { proId: params.proId, isVisible: true, proRating: { not: null } },
    include: { client: { select: { user: { select: { firstName: true, lastName: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ reviews });
}

export const GET = withErrorHandling(getHandler);
