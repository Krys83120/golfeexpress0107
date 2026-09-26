import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  productId: z.string().min(1),
  name: z.string().trim().min(1, "Le nom ne peut pas être vide."),
});

/**
 * PATCH /api/admin/pros/[proId]/products/rename
 *
 * Renomme UN produit (à ne pas confondre avec
 * .../products/rename-category, qui renomme/fusionne une catégorie
 * entière). Utilisé depuis la liste dépliée d'une catégorie dans
 * AdminCategoryManagerModal.tsx, pour corriger le nom d'un produit importé
 * (ex: accents corrompus par un CSV). Vérifie que le produit appartient
 * bien à CE Pro avant d'écrire.
 */
async function patchHandler(req: NextRequest, { params }: { params: { proId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const { proId } = params;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors[0]?.message ?? "Requête invalide.");
  }
  const { productId, name } = parsed.data;

  const existing = await prisma.product.findFirst({ where: { id: productId, proId } });
  if (!existing) {
    throw new ApiError(404, "Produit introuvable.");
  }

  const product = await prisma.product.update({ where: { id: productId }, data: { name } });

  return NextResponse.json({ id: product.id, name: product.name });
}
export const PATCH = withErrorHandling(patchHandler);
