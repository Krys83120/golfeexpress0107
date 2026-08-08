import { NextRequest, NextResponse } from "next/server";
import { UserRole, OrderStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/clients/me/fidelity-history
 *
 * Historique des points de fidélité gagnés par le client connecté. Les
 * points ne sont pas stockés ligne à ligne (pas de table FidelityLedger) :
 * on reconstitue l'historique depuis les commandes livrées, avec la même
 * règle que celle appliquée à la livraison dans
 * PATCH /api/orders/[orderId]/status (1 point par euro dépensé, arrondi à
 * l'entier inférieur). Ne couvre donc que les points gagnés, pas les points
 * dépensés (pas de système de récompenses réellement échangeables pour
 * l'instant côté backend).
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.CLIENT]);

  const client = await prisma.client.findUnique({ where: { userId: auth.userId } });
  if (!client) {
    throw new ApiError(404, "Profil client introuvable.");
  }

  const orders = await prisma.order.findMany({
    where: { clientId: client.id, status: OrderStatus.DELIVERED },
    select: { orderNumber: true, total: true, deliveredAt: true },
    orderBy: { deliveredAt: "desc" },
    take: 30,
  });

  const history = orders
    .map((o) => ({
      orderNumber: o.orderNumber,
      points: Math.floor(Number(o.total)),
      date: o.deliveredAt,
    }))
    .filter((e) => e.points > 0);

  return NextResponse.json({ history });
}

export const GET = withErrorHandling(getHandler);
