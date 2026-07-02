import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/riders
 *
 * Liste tous les livreurs (tous statuts) — vue admin avec infos de gestion
 * (véhicule, en ligne/hors ligne, gains totaux, nombre de livraisons).
 */
async function getHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const riders = await prisma.rider.findMany({
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ riders });
}

export const GET = withErrorHandling(getHandler);
