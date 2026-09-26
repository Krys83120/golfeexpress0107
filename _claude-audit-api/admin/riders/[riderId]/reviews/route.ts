import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/riders/[riderId]/reviews
 *
 * Avis clients laissés sur un livreur donné, pour la fiche livreur côté
 * admin (RiderDetailModal) — miroir de GET /api/pros/me/reviews et
 * GET /api/riders/me/reviews, mais côté admin : accès à TOUS les avis
 * (visibles ou masqués par modération) pour permettre à l'admin de voir
 * l'historique complet, contrairement aux routes destinées au Pro/livreur
 * lui-même qui ne renvoient que les avis visibles.
 */
async function getHandler(_req: NextRequest, { params }: { params: { riderId: string } }) {
  await requireAuth(_req, [UserRole.ADMIN]);

  const reviews = await prisma.review.findMany({
    where: { riderId: params.riderId, riderRating: { not: null } },
    include: { client: { select: { user: { select: { firstName: true, lastName: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ reviews });
}

export const GET = withErrorHandling(getHandler);
