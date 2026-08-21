import { NextResponse } from "next/server";
import { withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/reviews/platform-stats
 *
 * Endpoint PUBLIC (pas de requireAuth) -- renvoie la note moyenne et le
 * nombre d'avis clients sur l'application Do You Geckoo elle-même (volet
 * `platform` de Review, isVisible uniquement). Alimente le badge "Avis
 * vérifiés" du site vitrine (voir VerifiedReviewsBadge.tsx) : on affiche
 * de VRAIES données propres à la plateforme plutôt que d'imiter le badge
 * d'un service de certification tiers auquel Do You Geckoo n'est pas
 * abonné (contrairement à reparmonphone.fr, qui sert de référence
 * stylistique uniquement).
 */
async function getHandler() {
  const agg = await prisma.review.aggregate({
    where: { platformRating: { not: null }, isVisible: true },
    _avg: { platformRating: true },
    _count: { platformRating: true },
  });

  return NextResponse.json({
    average: agg._avg.platformRating ?? null,
    count: agg._count.platformRating,
  });
}

export const GET = withErrorHandling(getHandler);
