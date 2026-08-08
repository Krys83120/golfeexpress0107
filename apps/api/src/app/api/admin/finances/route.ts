import { NextRequest, NextResponse } from "next/server";
import { UserRole, OrderStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/finances
 *
 * Vue plateforme : GMV, revenu plateforme, et répartition du CA net perçu
 * par destinataire (Pro/Rider) sur les 30 derniers jours — calculé depuis
 * Order (mêmes champs que /api/admin/stats), pas de table Payout dédiée
 * (voir note dans /api/pros/me/finances). Cette liste montre donc "ce qui
 * est dû" par destinataire sur la période, pas un historique de virements
 * bancaires réellement exécutés.
 */
async function getHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const orders = await prisma.order.findMany({
    where: { status: OrderStatus.DELIVERED, deliveredAt: { gte: since } },
    select: {
      subtotal: true,
      proEarnings: true,
      riderEarnings: true,
      platformEarnings: true,
      pro: { select: { id: true, businessName: true } },
      rider: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
    },
  });

  const gmv30d = orders.reduce((sum, o) => sum + Number(o.subtotal), 0);
  const platformRevenue30d = orders.reduce((sum, o) => sum + Number(o.platformEarnings), 0);

  const proTotals = new Map<string, { name: string; amount: number }>();
  const riderTotals = new Map<string, { name: string; amount: number }>();

  for (const o of orders) {
    if (o.pro) {
      const entry = proTotals.get(o.pro.id) ?? { name: o.pro.businessName, amount: 0 };
      entry.amount += Number(o.proEarnings);
      proTotals.set(o.pro.id, entry);
    }
    if (o.rider) {
      const name = `${o.rider.user.firstName} ${o.rider.user.lastName}`;
      const entry = riderTotals.get(o.rider.id) ?? { name, amount: 0 };
      entry.amount += Number(o.riderEarnings);
      riderTotals.set(o.rider.id, entry);
    }
  }

  const recipients = [
    ...Array.from(proTotals.entries()).map(([id, v]) => ({
      id,
      recipientType: "PRO" as const,
      recipientName: v.name,
      amount: Math.round(v.amount * 100) / 100,
    })),
    ...Array.from(riderTotals.entries()).map(([id, v]) => ({
      id,
      recipientType: "RIDER" as const,
      recipientName: v.name,
      amount: Math.round(v.amount * 100) / 100,
    })),
  ].sort((a, b) => b.amount - a.amount);

  return NextResponse.json({
    gmv30d: Math.round(gmv30d * 100) / 100,
    platformRevenue30d: Math.round(platformRevenue30d * 100) / 100,
    recipients,
  });
}

export const GET = withErrorHandling(getHandler);
