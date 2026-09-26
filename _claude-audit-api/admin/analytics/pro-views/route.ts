import { NextRequest, NextResponse } from "next/server";
import { AppSource, UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/analytics/pro-views
 *
 * Vue d'ensemble Admin des compteurs de vues, tous commerçants et tous
 * produits confondus (19/09/2026, même chantier que GET /api/pros/me/views
 * côté Pro -- voir son commentaire pour le détail complet du tracking
 * réutilisé). Sert à repérer les boutiques/produits les plus consultés sur
 * la plateforme.
 */
async function getHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const rows = await prisma.appVisit.findMany({
    where: { app: AppSource.CLIENT, path: { startsWith: "/pro/" } },
    select: { path: true },
  });

  const proViewCounts = new Map<string, number>();
  const productViewCounts = new Map<string, number>();

  for (const row of rows) {
    if (!row.path) continue;
    // "/pro/<proId>" -> ["pro", proId] ; "/pro/<proId>/product/<productId>" -> ["pro", proId, "product", productId]
    const parts = row.path.split("/").filter(Boolean);
    if (parts.length === 2 && parts[0] === "pro") {
      proViewCounts.set(parts[1], (proViewCounts.get(parts[1]) ?? 0) + 1);
    } else if (parts.length === 4 && parts[0] === "pro" && parts[2] === "product") {
      productViewCounts.set(parts[3], (productViewCounts.get(parts[3]) ?? 0) + 1);
    }
  }

  const proIds = [...proViewCounts.keys()];
  const pros = proIds.length
    ? await prisma.pro.findMany({ where: { id: { in: proIds } }, select: { id: true, businessName: true } })
    : [];
  const proViews = pros
    .map((p) => ({ proId: p.id, businessName: p.businessName, views: proViewCounts.get(p.id) ?? 0 }))
    .sort((a, b) => b.views - a.views);

  const productIds = [...productViewCounts.keys()];
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, proId: true, pro: { select: { businessName: true } } },
      })
    : [];
  const productViews = products
    .map((p) => ({
      productId: p.id,
      name: p.name,
      proId: p.proId,
      businessName: p.pro.businessName,
      views: productViewCounts.get(p.id) ?? 0,
    }))
    .sort((a, b) => b.views - a.views);

  return NextResponse.json({ proViews, productViews });
}

export const GET = withErrorHandling(getHandler);
