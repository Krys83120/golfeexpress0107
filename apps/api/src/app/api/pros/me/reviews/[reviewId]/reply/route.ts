import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/pros/me/reviews/[reviewId]/reply
 *
 * Le commerçant répond publiquement à un avis client -- uniquement au
 * volet "pro" de l'avis (proComment), jamais aux volets livreur/plateforme
 * qui ne le concernent pas.
 */
async function postHandler(req: NextRequest, { params }: { params: { reviewId: string } }) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }

  const review = await prisma.review.findUnique({ where: { id: params.reviewId } });
  if (!review || review.proId !== pro.id) {
    throw new ApiError(404, "Avis introuvable.");
  }

  const body = (await req.json()) as { reply?: string };
  const reply = body.reply?.trim();
  if (!reply) {
    throw new ApiError(400, "La réponse ne peut pas être vide.");
  }

  const updated = await prisma.review.update({
    where: { id: review.id },
    data: { proReply: reply, proRepliedAt: new Date() },
    include: { client: { select: { user: { select: { firstName: true, lastName: true } } } } },
  });

  return NextResponse.json({ review: updated });
}

export const POST = withErrorHandling(postHandler);
