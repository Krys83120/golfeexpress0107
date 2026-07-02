import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/pros/[proId]/products
 *
 * Menu public d'un commerçant — seuls les produits disponibles
 * (isAvailable=true) sont renvoyés, contrairement à
 * GET /api/pros/me/products (vue de gestion côté Pro, qui montre tout).
 */
async function getHandler(req: NextRequest, ctx: { params: { proId: string } }) {
  const pro = await prisma.pro.findUnique({ where: { id: ctx.params.proId } });
  if (!pro || pro.status !== "ACTIVE") {
    throw new ApiError(404, "Commerçant introuvable.");
  }

  const products = await prisma.product.findMany({
    where: { proId: pro.id, isAvailable: true },
    include: { options: { include: { choices: true } } },
    orderBy: { category: "asc" },
  });

  return NextResponse.json({ products });
}

export const GET = withErrorHandling(getHandler);
