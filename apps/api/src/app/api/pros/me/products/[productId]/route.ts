import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { updateProductSchema } from "@/lib/validation/products";

/**
 * Vérifie que le produit existe et appartient bien au Pro connecté.
 * Centralise cette vérification pour PATCH et DELETE.
 */
async function getOwnedProductOrThrow(userId: string, productId: string) {
  const pro = await prisma.pro.findUnique({ where: { userId } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.proId !== pro.id) {
    throw new ApiError(404, "Produit introuvable.");
  }

  return { pro, product };
}

/**
 * PATCH /api/pros/me/products/[productId]
 * Body: champs partiels de Product (name, price, isAvailable, ...)
 */
async function patchHandler(req: NextRequest, ctx: { params: { productId: string } }) {
  const auth = await requireAuth(req, [UserRole.PRO]);
  await getOwnedProductOrThrow(auth.userId, ctx.params.productId);

  const body = await req.json().catch(() => null);
  const parsed = updateProductSchema.safeParse(body);

  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const product = await prisma.product.update({
    where: { id: ctx.params.productId },
    data: parsed.data,
  });

  return NextResponse.json({ product });
}

/**
 * DELETE /api/pros/me/products/[productId]
 */
async function deleteHandler(req: NextRequest, ctx: { params: { productId: string } }) {
  const auth = await requireAuth(req, [UserRole.PRO]);
  await getOwnedProductOrThrow(auth.userId, ctx.params.productId);

  await prisma.product.delete({ where: { id: ctx.params.productId } });

  return NextResponse.json({ success: true });
}

export const PATCH = withErrorHandling(patchHandler);
export const DELETE = withErrorHandling(deleteHandler);
