import { NextRequest, NextResponse } from "next/server";
import { AppSource } from "@golfeexpress/types";
import { requireProOrEmployee, withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/pros/me/views
 *
 * Compteur de vues de la boutique du Pro connecté, et de chacun de ses
 * produits (19/09/2026, demande explicite de Krys : "un compteur de vue sur
 * la page des pros et pour chaque produit"). Réutilise le tracking de
 * visites déjà en place (voir model AppVisit, POST /api/analytics/visit,
 * Admin > Visites) plutôt qu'une table dédiée : le Client envoie maintenant,
 * EN PLUS de son événement "app_open" habituel (jamais touché), un
 * événement par ouverture de fiche commerçant (path "/pro/<proId>") et par
 * ouverture de fiche produit (path "/pro/<proId>/product/<productId>") --
 * voir apps/client/src/services/analyticsApi.ts (trackPageView) et
 * ProDetailScreen.tsx.
 *
 * Entièrement anonyme comme le reste du tracking (AppVisit ne contient
 * aucune identité de visiteur) : "une vue" = une ouverture de fiche, pas un
 * visiteur unique -- choix explicite de Krys (plus simple, cohérent avec le
 * tracking existant qui compte déjà les ouvertures d'app de la même façon).
 *
 * Calculé à la volée à partir des lignes AppVisit correspondantes (même
 * esprit "pas de table dédiée tant que le volume ne le justifie pas" que
 * AdminFinancesPage.tsx "montants dus") -- à revoir vers des compteurs
 * incrémentés directement sur Pro/Product si le volume de visites grossit
 * beaucoup.
 */
async function getHandler(req: NextRequest) {
  const { proId } = await requireProOrEmployee(req);

  const proPath = `/pro/${proId}`;
  const productPrefix = `/pro/${proId}/product/`;

  const rows = await prisma.appVisit.findMany({
    where: { app: AppSource.CLIENT, path: { startsWith: proPath } },
    select: { path: true },
  });

  let pageViews = 0;
  const productViewCounts = new Map<string, number>();
  for (const row of rows) {
    if (!row.path) continue;
    if (row.path === proPath) {
      pageViews++;
    } else if (row.path.startsWith(productPrefix)) {
      const productId = row.path.slice(productPrefix.length);
      productViewCounts.set(productId, (productViewCounts.get(productId) ?? 0) + 1);
    }
  }

  const productIds = [...productViewCounts.keys()];
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
    : [];

  const productViews = products
    .map((p) => ({ productId: p.id, name: p.name, views: productViewCounts.get(p.id) ?? 0 }))
    .sort((a, b) => b.views - a.views);

  return NextResponse.json({ pageViews, productViews });
}

export const GET = withErrorHandling(getHandler);
