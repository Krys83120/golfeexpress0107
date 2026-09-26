import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { serializeProductWithoutOptions } from "@/lib/serializeProduct";

/**
 * PATCH /api/admin/pros/[proId]/products/[productId]
 * Body: { isAvailable: boolean }
 *
 * Permet à un admin de désactiver un produit litigieux (contenu
 * inapproprié, prix erroné signalé...) sans passer par le Pro — utile en
 * modération. Volontairement limité à isAvailable pour l'instant, pas
 * d'édition complète du produit depuis l'admin.
 */
async function patchHandler(req: NextRequest, ctx: { params: { proId: string; productId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  if (typeof body?.isAvailable !== "boolean") {
    throw new ApiError(400, "Le champ isAvailable (booléen) est requis.");
  }

  const product = await prisma.product.findUnique({ where: { id: ctx.params.productId } });
  if (!product || product.proId !== ctx.params.proId) {
    throw new ApiError(404, "Produit introuvable pour ce commerçant.");
  }

  const updated = await prisma.product.update({
    where: { id: ctx.params.productId },
    data: { isAvailable: body.isAvailable },
  });

  return NextResponse.json({ product: serializeProductWithoutOptions(updated) });
}

export const PATCH = withErrorHandling(patchHandler);
