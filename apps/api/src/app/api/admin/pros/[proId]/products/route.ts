import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/lib/serializeProduct";

/**
 * GET /api/admin/pros/[proId]/products
 *
 * Contrairement à GET /api/pros/[proId]/products (vue publique Client, ne
 * montre que isAvailable=true), cette route renvoie TOUS les produits du
 * Pro — nécessaire pour qu'un admin puisse contrôler l'intégralité du
 * catalogue en ligne, y compris les produits désactivés.
 */
async function getHandler(req: NextRequest, ctx: { params: { proId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const pro = await prisma.pro.findUnique({ where: { id: ctx.params.proId } });
  if (!pro) {
    throw new ApiError(404, "Commerçant introuvable.");
  }

  const products = await prisma.product.findMany({
    where: { proId: ctx.params.proId },
    include: { options: { include: { choices: true } } },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ products: products.map(serializeProduct) });
}

export const GET = withErrorHandling(getHandler);
