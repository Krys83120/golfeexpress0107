import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

const replySchema = z.object({
  reply: z.string().min(1, "La réponse ne peut pas être vide.").max(1000),
});

/**
 * POST /api/pros/me/reviews/[reviewId]/reply
 * Body: { reply: string }
 *
 * Un Pro ne peut répondre qu'une fois à un avis (proReply est soit vide,
 * soit déjà rempli — pas d'édition de réponse pour l'instant, cohérent avec
 * le comportement attendu des plateformes d'avis classiques).
 */
async function postHandler(req: NextRequest, ctx: { params: { reviewId: string } }) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }

  const review = await prisma.review.findUnique({ where: { id: ctx.params.reviewId } });
  if (!review || review.proId !== pro.id) {
    throw new ApiError(404, "Avis introuvable.");
  }
  if (review.proReply) {
    throw new ApiError(400, "Vous avez déjà répondu à cet avis.");
  }

  const body = await req.json().catch(() => null);
  const parsed = replySchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const updated = await prisma.review.update({
    where: { id: review.id },
    data: { proReply: parsed.data.reply, proRepliedAt: new Date() },
  });

  return NextResponse.json({ review: updated });
}

export const POST = withErrorHandling(postHandler);
