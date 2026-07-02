import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, UserRole, RiderStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/riders/me/available-orders
 *
 * Liste les commandes READY sans livreur assigné. Pour ce premier jet, pas
 * de vrai filtrage géographique (distance à vol d'oiseau depuis la position
 * du rider) — toutes les commandes READY sont renvoyées, triées par date.
 * TODO: une fois `Rider.currentLat/currentLng` peuplé en continu (via les
 * apps qui appellent PATCH /api/riders/me/location), filtrer par rayon avec
 * une requête PostGIS ou un calcul Haversine simple en SQL brut.
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.RIDER]);

  const rider = await prisma.rider.findUnique({ where: { userId: auth.userId } });
  if (!rider) {
    throw new ApiError(404, "Profil livreur introuvable.");
  }
  if (rider.status !== RiderStatus.ACTIVE) {
    throw new ApiError(403, "Votre compte livreur n'est pas encore activé.");
  }

  const orders = await prisma.order.findMany({
    where: { status: OrderStatus.READY, riderId: null },
    include: {
      items: true,
      pro: { select: { id: true, businessName: true, logo: true, category: true } },
      fromAddress: true,
      toAddress: true,
    },
    orderBy: { readyAt: "asc" },
    take: 20,
  });

  return NextResponse.json({ orders });
}

export const GET = withErrorHandling(getHandler);
