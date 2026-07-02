import { NextRequest, NextResponse } from "next/server";
import { UserRole, OrderStatus, ProStatus, RiderStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/stats
 *
 * Statistiques agrégées de la plateforme pour le Dashboard admin :
 * revenus plateforme (7j), nombre de commandes (7j), commerçants/livreurs
 * actifs, et un point de CA par jour sur 7 jours pour le graphique.
 *
 * Toutes ces valeurs sont calculées à la volée depuis les tables existantes
 * (Order, Pro, Rider) — pas de table d'agrégats pré-calculés pour ce
 * premier jet. Si le volume de données devient important, envisager un job
 * de calcul périodique plutôt qu'un calcul à chaque requête.
 */
async function getHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [recentOrders, activeProCount, activeRiderCount] = await Promise.all([
    prisma.order.findMany({
      where: { placedAt: { gte: sevenDaysAgo } },
      select: {
        placedAt: true,
        status: true,
        subtotal: true,
        platformEarnings: true,
        proEarnings: true,
        riderEarnings: true,
        pro: { select: { category: true } },
      },
    }) as Promise<
      Array<{
        placedAt: Date;
        status: OrderStatus;
        subtotal: unknown;
        platformEarnings: unknown;
        proEarnings: unknown;
        riderEarnings: unknown;
        pro: { category: string } | null;
      }>
    >,
    prisma.pro.count({ where: { status: ProStatus.ACTIVE } }),
    prisma.rider.count({ where: { status: RiderStatus.ACTIVE } }),
  ]);

  const deliveredOrders = recentOrders.filter((o) => o.status === OrderStatus.DELIVERED);
  const platformRevenue = deliveredOrders.reduce((sum, o) => sum + Number(o.platformEarnings), 0);
  const gmv7d = deliveredOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);

  // Revenus par catégorie de commerçant (7 derniers jours, commandes livrées uniquement).
  const revenueByCategory = new Map<string, { revenue: number; orderCount: number }>();
  for (const o of deliveredOrders) {
    const category = o.pro?.category ?? "AUTRE";
    const entry = revenueByCategory.get(category) ?? { revenue: 0, orderCount: 0 };
    entry.revenue += Number(o.subtotal);
    entry.orderCount += 1;
    revenueByCategory.set(category, entry);
  }
  const categoryBreakdown = Array.from(revenueByCategory.entries())
    .map(([category, data]) => ({ category, revenue: Math.round(data.revenue * 100) / 100, orderCount: data.orderCount }))
    .sort((a, b) => b.revenue - a.revenue);

  // Construit un point de revenu par jour sur les 7 derniers jours (platform/pros/riders).
  const dayLabels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const revenueByDay: { label: string; platform: number; pros: number; riders: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const dayOrders = deliveredOrders.filter((o) => {
      const placed = new Date(o.placedAt);
      return (
        placed.getDate() === day.getDate() &&
        placed.getMonth() === day.getMonth() &&
        placed.getFullYear() === day.getFullYear()
      );
    });
    revenueByDay.push({
      label: dayLabels[day.getDay()],
      platform: Math.round(dayOrders.reduce((sum, o) => sum + Number(o.platformEarnings), 0) * 100) / 100,
      pros: Math.round(dayOrders.reduce((sum, o) => sum + Number(o.proEarnings), 0) * 100) / 100,
      riders: Math.round(dayOrders.reduce((sum, o) => sum + Number(o.riderEarnings), 0) * 100) / 100,
    });
  }

  return NextResponse.json({
    platformRevenue7d: Math.round(platformRevenue * 100) / 100,
    gmv7d: Math.round(gmv7d * 100) / 100,
    orderCount7d: recentOrders.length,
    activeProCount,
    activeRiderCount,
    revenueByDay,
    categoryBreakdown,
  });
}

export const GET = withErrorHandling(getHandler);
