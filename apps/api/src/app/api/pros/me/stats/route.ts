import { NextRequest, NextResponse } from "next/server";
import { UserRole, OrderStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { resolveStatsRange, formatStatsDateRange, STATS_PERIODS, type StatsPeriod } from "@/lib/statsPeriods";

/**
 * GET /api/pros/me/stats?period=today|week|month|year|all|custom&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Statistiques de vente (23/09/2026, demande explicite de Krys) -- total
 * vendu par produit + classement des meilleures ventes, calculés depuis les
 * VRAIES commandes livrées (status DELIVERED, même logique que
 * /api/pros/me/finances), sur la période demandée.
 *
 * `from`/`to` (23/09/2026, retour de Krys : "que l'on puisse exporter avec
 * une plage de date") ne sont utilisés que pour period=custom -- voir
 * resolveStatsRange côté statsPeriods.ts pour le détail des bornes calculées.
 * Ignorés silencieusement pour les autres périodes.
 *
 * Contrairement au Dashboard existant (dashboardAggregations.ts côté
 * client), qui n'agrège que les commandes déjà en mémoire dans le store
 * (limitées par le `take: 50` de GET /api/orders), cet endpoint fait
 * l'agrégation côté serveur sur TOUT l'historique réel -- indispensable
 * pour un vrai bilan sur l'année.
 *
 * Réservé au patron (comme /finances, pas requireProOrEmployee) -- expose
 * le chiffre d'affaires, donc jamais accessible à un compte employé (voir
 * EMPLOYEE_NAV_KEYS côté Sidebar.tsx).
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }

  const periodParam = req.nextUrl.searchParams.get("period") ?? "week";
  if (!STATS_PERIODS.includes(periodParam as StatsPeriod)) {
    throw new ApiError(400, "Période invalide (today, week, month, year, all ou custom).");
  }
  const period = periodParam as StatsPeriod;
  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");
  const { since, until, rangeLabel } = resolveStatsRange(period, fromParam, toParam);

  const orders = await prisma.order.findMany({
    where: {
      proId: pro.id,
      status: OrderStatus.DELIVERED,
      ...(since ? { deliveredAt: { gte: since, ...(until ? { lte: until } : {}) } } : {}),
    },
    select: { id: true, subtotal: true, deliveredAt: true },
  });

  const orderIds = orders.map((o) => o.id);
  const revenueTotal = orders.reduce((sum, o) => sum + Number(o.subtotal), 0);

  // Plage de dates RÉELLEMENT couverte par les commandes trouvées (et non
  // les bornes théoriques since/until) -- voir formatStatsDateRange. Reste
  // utile même en "custom" : montre les ventes réelles à l'intérieur de la
  // plage choisie, qui peut être plus étroite que la plage demandée.
  const deliveredDates = orders.map((o) => o.deliveredAt).filter((d): d is Date => d !== null);
  const rangeStart = deliveredDates.length ? new Date(Math.min(...deliveredDates.map((d) => d.getTime()))) : null;
  const rangeEnd = deliveredDates.length ? new Date(Math.max(...deliveredDates.map((d) => d.getTime()))) : null;

  const items = orderIds.length
    ? await prisma.orderItem.findMany({
        where: { orderId: { in: orderIds } },
        select: { orderId: true, productName: true, quantity: true, totalPrice: true },
      })
    : [];

  const byProduct = new Map<string, { productName: string; quantitySold: number; revenue: number; orderIds: Set<string> }>();
  for (const item of items) {
    const existing = byProduct.get(item.productName);
    if (existing) {
      existing.quantitySold += item.quantity;
      existing.revenue += Number(item.totalPrice);
      existing.orderIds.add(item.orderId);
    } else {
      byProduct.set(item.productName, {
        productName: item.productName,
        quantitySold: item.quantity,
        revenue: Number(item.totalPrice),
        orderIds: new Set([item.orderId]),
      });
    }
  }

  const products = Array.from(byProduct.values())
    .map((p) => ({
      productName: p.productName,
      quantitySold: p.quantitySold,
      revenue: Math.round(p.revenue * 100) / 100,
      orderCount: p.orderIds.size,
    }))
    .sort((a, b) => b.quantitySold - a.quantitySold);

  return NextResponse.json({
    period,
    rangeLabel,
    dateRangeLabel: formatStatsDateRange(rangeStart, rangeEnd),
    summary: {
      orderCount: orders.length,
      revenueTotal: Math.round(revenueTotal * 100) / 100,
      avgBasket: orders.length ? Math.round((revenueTotal / orders.length) * 100) / 100 : 0,
    },
    products,
  });
}

export const GET = withErrorHandling(getHandler);
