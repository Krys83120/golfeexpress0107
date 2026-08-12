import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const renameCategorySchema = z.object({
  oldName: z.string().min(1),
  newName: z.string().min(1, "Le nouveau nom de catégorie est requis."),
});

/**
 * PATCH /api/pros/me/products/rename-category
 *
 * Renomme une catégorie sur TOUS les produits du Pro qui l'utilisent en un
 * seul appel — les catégories ne sont pas une table à part (juste un champ
 * texte libre sur Product, voir ProductFormModal côté Pro), donc "gérer
 * les catégories" revient à renommer en masse plutôt qu'éditer une entité
 * séparée. Fusionne implicitement deux catégories si newName correspond
 * au nom d'une catégorie déjà existante.
 */
async function patchHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }

  const body = await req.json().catch(() => null);
  const parsed = renameCategorySchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const { count } = await prisma.product.updateMany({
    where: { proId: pro.id, category: parsed.data.oldName },
    data: { category: parsed.data.newName },
  });

  return NextResponse.json({ updatedCount: count });
}

export const PATCH = withErrorHandling(patchHandler);
