import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, UserRole, RiderStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { isWithinRiderSearchWindow } from "@/lib/riderSearchWindow";

/**
 * GET /api/riders/me/available-orders
 *
 * Liste les commandes disponibles pour ce livreur : les commandes READY
 * (déjà prêtes), MAIS AUSSI les commandes encore PREPARING dont la fenêtre
 * de recherche anticipée est ouverte (voir riderSearchWindow.ts) — pour
 * que le livreur puisse être en route avant que la commande soit
 * officiellement prête, plutôt que d'ajouter son trajet APRÈS la
 * préparation. Le filtrage de la fenêtre se fait en JS après la requête
 * (pas simple à exprimer proprement dans une clause Prisma `where`, et le
 * volume de commandes PREPARING actives reste faible).
 *
 * Pour ce premier jet, pas de vrai filtrage géographique (distance à vol
 * d'oiseau depuis la position du rider) — toutes les commandes
 * disponibles sont renvoyées, triées par urgence. TODO: une fois
 * `Rider.currentLat/currentLng` peuplé en continu, filtrer par rayon avec
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

  const candidates = await prisma.order.findMany({
    where: {
      riderId: null,
      OR: [
        { status: OrderStatus.READY },
        { status: OrderStatus.PREPARING, preparingStartedAt: { not: null }, estimatedPrepMinutes: { not: null } },
      ],
    },
    include: {
      items: true,
      pro: { select: { id: true, businessName: true, logo: true, category: true } },
      fromAddress: true,
      toAddress: true,
    },
    orderBy: { placedAt: "asc" },
    take: 40,
  });

  const orders = candidates
    .filter((order) => {
      if (order.status === OrderStatus.READY) return true;
      return isWithinRiderSearchWindow(order.preparingStartedAt!, order.estimatedPrepMinutes!);
    })
    .slice(0, 20);

  return NextResponse.json({ orders });
}

export const GET = withErrorHandling(getHandler);
