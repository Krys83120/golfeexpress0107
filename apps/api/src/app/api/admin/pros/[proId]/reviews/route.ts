import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/pros/[proId]/reviews
 *
 * Avis clients laissés sur un commerçant donné, pour la fiche commerçant
 * côté admin (ProDetailModal) — miroir de GET /api/admin/riders/[riderId]/reviews :
 * accès à TOUS les avis (visibles ou masqués par modération), contrairement
 * à GET /api/pros/me/reviews et GET /api/pros/[proId]/reviews qui ne
 * renvoient que les avis visibles.
 */
async function getHandler(_req: NextRequest, { params }: { params: { proId: string } }) {
  await requireAuth(_req, [UserRole.ADMIN]);

  const reviews = await prisma.review.findMany({
    where: { proId: params.proId, proRating: { not: null } },
    include: { client: { select: { user: { select: { firstName: true, lastName: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ reviews });
}

export const GET = withErrorHandling(getHandler);
