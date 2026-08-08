import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/riders/me/earnings
 *
 * Historique des gains du livreur connecté (table Earning, alimentée par
 * PATCH /api/orders/[orderId]/status au moment du passage en DELIVERED) +
 * un résumé (solde disponible, en attente, totaux semaine/mois).
 *
 * `availableBalance` est lu directement sur Rider.balance (source de vérité,
 * décrémentée lors des retraits) plutôt que recalculé depuis Earning à
 * chaque requête, pour rester cohérent même après un retrait partiel.
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.RIDER]);

  const rider = await prisma.rider.findUnique({ where: { userId: auth.userId } });
  if (!rider) {
    throw new ApiError(404, "Profil livreur introuvable.");
  }

  const earnings = await prisma.earning.findMany({
    where: { riderId: rider.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Pas de relation Prisma Earning -> Order (seulement orderId scalaire) :
  // on résout les numéros de commande en une seule requête groupée plutôt
  // qu'un `include` (impossible ici) ou N+1 requêtes.
  const orderNumbers = await prisma.order.findMany({
    where: { id: { in: earnings.map((e) => e.orderId) } },
    select: { id: true, orderNumber: true },
  });
  const orderNumberById = new Map(orderNumbers.map((o) => [o.id, o.orderNumber]));

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const pendingBalance = earnings
    .filter((e) => e.status === "PENDING")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const weekTotal = earnings
    .filter((e) => e.createdAt >= startOfWeek)
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const monthTotal = earnings
    .filter((e) => e.createdAt >= startOfMonth)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  return NextResponse.json({
    earnings: earnings.map((e) => ({
      id: e.id,
      orderNumber: orderNumberById.get(e.orderId) ?? "—",
      type: e.type,
      amount: Number(e.amount),
      status: e.status,
      createdAt: e.createdAt,
    })),
    summary: {
      availableBalance: Number(rider.balance),
      pendingBalance: Math.round(pendingBalance * 100) / 100,
      weekTotal: Math.round(weekTotal * 100) / 100,
      monthTotal: Math.round(monthTotal * 100) / 100,
    },
  });
}

export const GET = withErrorHandling(getHandler);
