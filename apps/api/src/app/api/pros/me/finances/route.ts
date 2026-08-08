import { NextRequest, NextResponse } from "next/server";
import { UserRole, OrderStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

const WEEKS_OF_HISTORY = 8;

/**
 * GET /api/pros/me/finances
 *
 * CA/commission/net du mois en cours + répartition hebdomadaire des 8
 * dernières semaines, calculés à la volée depuis les commandes livrées
 * (mêmes champs que /api/admin/stats : subtotal, proEarnings).
 *
 * Pas de table Payout dédiée : il n'existe pas encore de vrai virement
 * bancaire périodique déclenché côté plateforme, donc on ne renvoie pas de
 * "statut de versement" fictif — seulement le CA réel par semaine. Le
 * prochain relevé bancaire réel reste "à venir" côté UI tant que ce
 * versement automatique n'est pas implémenté.
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }

  const since = new Date();
  since.setDate(since.getDate() - WEEKS_OF_HISTORY * 7);

  const orders = await prisma.order.findMany({
    where: { proId: pro.id, status: OrderStatus.DELIVERED, deliveredAt: { gte: since } },
    select: { subtotal: true, proEarnings: true, deliveredAt: true },
  });

  const now = new Date();
  const monthOrders = orders.filter(
    (o) => o.deliveredAt && o.deliveredAt.getMonth() === now.getMonth() && o.deliveredAt.getFullYear() === now.getFullYear(),
  );
  const monthGross = monthOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);
  const monthNet = monthOrders.reduce((sum, o) => sum + Number(o.proEarnings), 0);

  // Semaines glissantes (lundi -> dimanche) sur les 8 dernières semaines.
  const weeks: { weekStart: Date; weekEnd: Date }[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const dayOfWeek = (cursor.getDay() + 6) % 7; // 0 = lundi
  cursor.setDate(cursor.getDate() - dayOfWeek);
  for (let i = 0; i < WEEKS_OF_HISTORY; i++) {
    const weekEnd = new Date(cursor);
    weekEnd.setDate(cursor.getDate() + 6);
    weeks.unshift({ weekStart: new Date(cursor), weekEnd });
    cursor.setDate(cursor.getDate() - 7);
  }

  const formatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
  const weeklyHistory = weeks.map(({ weekStart, weekEnd }) => {
    const weekOrders = orders.filter((o) => o.deliveredAt && o.deliveredAt >= weekStart && o.deliveredAt <= weekEnd);
    const grossAmount = weekOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);
    const netAmount = weekOrders.reduce((sum, o) => sum + Number(o.proEarnings), 0);
    return {
      periodLabel: `Semaine du ${formatter.format(weekStart)} au ${formatter.format(weekEnd)}`,
      grossAmount: Math.round(grossAmount * 100) / 100,
      commission: Math.round((grossAmount - netAmount) * 100) / 100,
      netAmount: Math.round(netAmount * 100) / 100,
      orderCount: weekOrders.length,
    };
  });

  return NextResponse.json({
    summary: {
      commissionRate: Number(pro.commissionRate),
      subscriptionType: pro.subscriptionType,
      monthGross: Math.round(monthGross * 100) / 100,
      monthCommission: Math.round((monthGross - monthNet) * 100) / 100,
      monthNet: Math.round(monthNet * 100) / 100,
    },
    weeklyHistory,
  });
}

export const GET = withErrorHandling(getHandler);
