import { NextRequest, NextResponse } from "next/server";
import { UserRole, OrderStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { resolveStatsPeriod, STATS_PERIODS, type StatsPeriod } from "@/lib/statsPeriods";

/**
 * GET /api/pros/me/stats/export?period=today|week|month|year|all
 *
 * Export CSV (23/09/2026, demande explicite de Krys) -- une ligne par
 * produit vendu sur commande livrée, sur la période choisie : quantité,
 * nombre de commandes, CA généré. Assez de colonnes pour être exploité à la
 * fois côté produits (meilleures ventes) et côté finances (CA par produit).
 * Pour un justificatif comptable par commande individuelle, le Rapport Z
 * existant (Finances) reste la référence -- ce fichier-ci est un bilan
 * agrégé par produit, pas un relevé ligne par ligne des commandes.
 *
 * Réservé au patron, comme /api/pros/me/stats (voir ce fichier pour le
 * détail du raisonnement sur requireAuth vs requireProOrEmployee).
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (!pro) throw new ApiError(404, "Profil commerçant introuvable.");

  const periodParam = req.nextUrl.searchParams.get("period") ?? "week";
  if (!STATS_PERIODS.includes(periodParam as StatsPeriod)) {
    throw new ApiError(400, "Période invalide (today, week, month, year ou all).");
  }
  const period = periodParam as StatsPeriod;
  const { since, rangeLabel } = resolveStatsPeriod(period);

  const orders = await prisma.order.findMany({
    where: {
      proId: pro.id,
      status: OrderStatus.DELIVERED,
      ...(since ? { deliveredAt: { gte: since } } : {}),
    },
    select: { id: true },
  });
  const orderIds = orders.map((o) => o.id);

  const items = orderIds.length
    ? await prisma.orderItem.findMany({
        where: { orderId: { in: orderIds } },
        select: { orderId: true, productName: true, quantity: true, totalPrice: true },
      })
    : [];

  const byProduct = new Map<string, { quantitySold: number; revenue: number; orderIds: Set<string> }>();
  for (const item of items) {
    const existing = byProduct.get(item.productName);
    if (existing) {
      existing.quantitySold += item.quantity;
      existing.revenue += Number(item.totalPrice);
      existing.orderIds.add(item.orderId);
    } else {
      byProduct.set(item.productName, {
        quantitySold: item.quantity,
        revenue: Number(item.totalPrice),
        orderIds: new Set([item.orderId]),
      });
    }
  }

  const rows = Array.from(byProduct.entries())
    .map(([productName, p]) => ({
      productName,
      quantitySold: p.quantitySold,
      orderCount: p.orderIds.size,
      revenue: Math.round(p.revenue * 100) / 100,
    }))
    .sort((a, b) => b.quantitySold - a.quantitySold);

  // Échappe guillemets/points-virgules/retours à la ligne -- un nom de
  // produit peut légitimement en contenir.
  function csvField(value: string | number): string {
    const str = String(value);
    return /[",;\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  }

  const header = ["Produit", "Quantité vendue", "Nombre de commandes", "Chiffre d'affaires (€)"];
  const lines = [
    `Statistiques Do You Geckoo - ${pro.businessName} - ${rangeLabel}`,
    "",
    header.join(";"),
    ...rows.map((r) => [csvField(r.productName), r.quantitySold, r.orderCount, r.revenue.toFixed(2)].join(";")),
  ];

  // Séparateur ";" (et non ",") + BOM UTF-8 en tête -- Excel version FR
  // (l'environnement de Krys) attend ce format par défaut pour un CSV,
  // sinon les colonnes ne se séparent pas et les accents s'affichent mal.
  const csv = "﻿" + lines.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="statistiques-${period}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

export const GET = withErrorHandling(getHandler);
