import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  // Liste COMPLÈTE des produits d'UNE catégorie, dans l'ordre voulu --
  // chaque id reçoit son index comme sortOrder (voir Product.sortOrder).
  // Le tri se fait par catégorie côté admin (AdminCategoryManagerModal.tsx,
  // un glisser-déposer par catégorie ouverte), jamais tous produits
  // confondus, mais cette route reste volontairement indifférente à la
  // catégorie : elle se contente d'appliquer l'ordre reçu aux ids donnés.
  productIds: z.array(z.string().min(1)).min(1),
});

/**
 * PUT /api/admin/pros/[proId]/products/reorder
 *
 * Enregistre l'ordre des produits ("sous-catégories" côté admin) après un
 * glisser-déposer. Vérifie que chaque id appartient bien à CE Pro avant
 * d'écrire (updateMany avec proId dans le where) -- empêche un id d'un
 * autre commerçant, malformé ou copié par erreur, de modifier des données
 * qui ne lui appartiennent pas.
 */
async function putHandler(req: NextRequest, { params }: { params: { proId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const { proId } = params;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors[0]?.message ?? "Requête invalide.");
  }

  const results = await prisma.$transaction(
    parsed.data.productIds.map((id, index) =>
      prisma.product.updateMany({ where: { id, proId }, data: { sortOrder: index } })
    )
  );
  const updatedCount = results.reduce((sum, r) => sum + r.count, 0);

  return NextResponse.json({ updatedCount });
}
export const PUT = withErrorHandling(putHandler);
