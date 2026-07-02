import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/pros/me/reviews
 *
 * Liste les avis (Review) laissés sur la boutique du Pro connecté, du plus
 * récent au plus ancien. N'inclut que les avis visibles (isVisible=true) —
 * les avis masqués (modération) ne sont pas renvoyés même au Pro concerné.
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }

  const reviews = await prisma.review.findMany({
    where: { proId: pro.id, isVisible: true },
    include: { client: { select: { user: { select: { firstName: true, lastName: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ reviews });
}

export const GET = withErrorHandling(getHandler);
