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
 * PATCH /api/admin/pros/[proId]/products/rename-category
 *
 * Équivalent admin de PATCH /api/pros/me/products/rename-category — permet
 * de modérer/réorganiser les catégories d'un Pro depuis l'admin (ex: nom
 * de catégorie inapproprié ou mal orthographié), sans devoir passer par
 * le Pro lui-même.
 */
async function patchHandler(req: NextRequest, ctx: { params: { proId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  const parsed = renameCategorySchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const { count } = await prisma.product.updateMany({
    where: { proId: ctx.params.proId, category: parsed.data.oldName },
    data: { category: parsed.data.newName },
  });

  return NextResponse.json({ updatedCount: count });
}

export const PATCH = withErrorHandling(patchHandler);
