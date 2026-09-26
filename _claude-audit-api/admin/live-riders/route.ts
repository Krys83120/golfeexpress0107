import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/live-riders
 *
 * Position actuelle des livreurs en ligne, pour la carte live du dashboard
 * admin. Ne renvoie que les riders avec une position connue
 * (currentLat/currentLng non nuls).
 *
 * Pour du temps réel sans polling, les apps peuvent remplacer l'appel
 * périodique à cette route par une souscription Supabase Realtime
 * (postgres_changes sur Rider, filter isOnline=eq.true) — voir
 * apps/api/REALTIME.md.
 */
async function getHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const riders = (await prisma.rider.findMany({
    where: {
      isOnline: true,
      currentLat: { not: null },
      currentLng: { not: null },
    },
    select: {
      id: true,
      currentLat: true,
      currentLng: true,
      vehicleType: true,
      orders: {
        where: { status: { in: ["RIDER_ASSIGNED", "PICKED_UP", "IN_DELIVERY"] } },
        select: { id: true },
        take: 1,
      },
    },
  })) as Array<{
    id: string;
    currentLat: unknown;
    currentLng: unknown;
    vehicleType: string;
    orders: Array<{ id: string }>;
  }>;

  const livePositions = riders.map((r) => ({
    id: r.id,
    lat: Number(r.currentLat),
    lng: Number(r.currentLng),
    vehicleType: r.vehicleType,
    isDelivering: r.orders.length > 0,
  }));

  return NextResponse.json({ riders: livePositions });
}

export const GET = withErrorHandling(getHandler);
