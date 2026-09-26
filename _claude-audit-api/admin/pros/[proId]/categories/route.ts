import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/pros/[proId]/categories
 *
 * Liste les catégories de menu d'un Pro pour l'admin (AdminCategoryManagerModal.tsx),
 * avec leur nombre de produits, leur photo optionnelle et leur ordre
 * d'affichage (voir model MenuCategory) -- une catégorie jamais personnalisée
 * n'a pas encore de ligne MenuCategory : elle apparaît quand même ici (comptée
 * depuis Product.category directement), sans photo, classée après les
 * catégories déjà personnalisées.
 */
async function getHandler(req: NextRequest, { params }: { params: { proId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const { proId } = params;

  const products = await prisma.product.findMany({ where: { proId }, select: { category: true } });
  const counts = new Map<string, number>();
  for (const p of products) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);

  const menuCategories = await prisma.menuCategory.findMany({ where: { proId } });
  const byName = new Map(menuCategories.map((c) => [c.name, c]));

  const categories = Array.from(counts.keys())
    .map((name) => {
      const custom = byName.get(name);
      return {
        name,
        count: counts.get(name) ?? 0,
        image: custom?.image ?? null,
        sortOrder: custom?.sortOrder ?? null,
      };
    })
    .sort((a, b) => {
      if (a.sortOrder !== null && b.sortOrder !== null) return a.sortOrder - b.sortOrder;
      if (a.sortOrder !== null) return -1;
      if (b.sortOrder !== null) return 1;
      return a.name.localeCompare(b.name, "fr");
    });

  return NextResponse.json({ categories });
}
export const GET = withErrorHandling(getHandler);

const reorderSchema = z.object({
  // Liste COMPLÈTE des catégories de ce Pro, dans l'ordre voulu -- chaque
  // nom reçoit son index comme sortOrder (0, 1, 2...), qu'il ait déjà une
  // ligne MenuCategory ou non (upsert). Une catégorie qui existe en base
  // mais absente de cette liste (rare : produit supprimé entre-temps) n'est
  // pas touchée.
  order: z.array(z.string().min(1)).min(1),
});

/**
 * PUT /api/admin/pros/[proId]/categories
 *
 * Enregistre le nouvel ordre des catégories après un glisser-déposer côté
 * admin -- ré-écrit systématiquement le sortOrder de TOUTES les catégories
 * listées (upsert), jamais seulement celle déplacée, pour rester cohérent
 * avec la liste affichée au moment du drag (voir AdminCategoryManagerModal.tsx).
 */
async function putHandler(req: NextRequest, { params }: { params: { proId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const { proId } = params;

  const json = await req.json().catch(() => null);
  const parsed = reorderSchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors[0]?.message ?? "Requête invalide.");
  }

  await prisma.$transaction(
    parsed.data.order.map((name, index) =>
      prisma.menuCategory.upsert({
        where: { proId_name: { proId, name } },
        create: { proId, name, sortOrder: index },
        update: { sortOrder: index },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
export const PUT = withErrorHandling(putHandler);
