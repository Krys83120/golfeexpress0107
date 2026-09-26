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
      user: { select: { firstName: true, lastName: true, email: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Champs Decimal -> nombres JS (sinon sérialisés en texte côté JSON,
  // cassant .toFixed()/calculs et le placement sur la carte).
  const serialized = riders.map((r) => ({
    ...r,
    currentLat: r.currentLat !== null ? Number(r.currentLat) : null,
    currentLng: r.currentLng !== null ? Number(r.currentLng) : null,
    rating: r.rating !== null ? Number(r.rating) : null,
    totalEarnings: Number(r.totalEarnings),
    balance: Number(r.balance),
  }));

  return NextResponse.json({ riders: serialized });
}

export const GET = withErrorHandling(getHandler);
