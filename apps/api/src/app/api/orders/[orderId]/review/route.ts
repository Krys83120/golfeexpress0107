import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { createReviewSchema } from "@/lib/validation/reviews";

/**
 * POST /api/orders/[orderId]/review
 *
 * Un client note en une seule fois les 4 aspects de sa commande livrée :
 * le produit, le commerçant, le livreur (si assigné), et la plateforme.
 * Crée une seule ligne Review par commande (orderId est unique — voir
 * prisma/schema.prisma) et met à jour au passage les moyennes affichées
 * (Pro.rating/ratingCount, Rider.rating/ratingCount) : personne d'autre
 * n'écrit ces compteurs aujourd'hui, donc c'est cette route qui en est la
 * seule source de vérité.
 *
 * GET /api/orders/[orderId]/review renvoie l'avis existant (ou null) pour
 * que l'app Client sache si la commande a déjà été notée avant d'afficher
 * le formulaire.
 */
async function postHandler(req: NextRequest, ctx: { params: { orderId: string } }) {
  const auth = await requireAuth(req, [UserRole.CLIENT]);

  const client = await prisma.client.findUnique({ where: { userId: auth.userId } });
  if (!client) {
    throw new ApiError(404, "Profil client introuvable.");
  }

  const order = await prisma.order.findUnique({ where: { id: ctx.params.orderId } });
  if (!order || order.clientId !== client.id) {
    throw new ApiError(404, "Commande introuvable.");
  }
  if (order.status !== OrderStatus.DELIVERED) {
    throw new ApiError(400, "Cette commande n'a pas encore été livrée.");
  }

  const existing = await prisma.review.findUnique({ where: { orderId: order.id } });
  if (existing) {
    throw new ApiError(409, "Vous avez déjà laissé un avis pour cette commande.");
  }

  const body = await req.json().catch(() => null);
  const parsed = createReviewSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }
  const { productRating, proRating, riderRating, platformRating, comment } = parsed.data;

  // riderRating n'est pris en compte que si un livreur est réellement
  // rattaché à la commande — évite de fausser la moyenne d'un livreur au
  // hasard si l'app envoyait quand même une valeur par défaut.
  const effectiveRiderRating = order.riderId ? riderRating ?? null : null;

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        clientId: client.id,
        proId: order.proId,
        riderId: order.riderId,
        orderId: order.id,
        rating: proRating,
        productRating,
        riderRating: effectiveRiderRating,
        platformRating,
        comment,
      },
    });

    const pro = await tx.pro.findUnique({ where: { id: order.proId }, select: { rating: true, ratingCount: true } });
    if (pro) {
      const newCount = pro.ratingCount + 1;
      const newAverage = (Number(pro.rating ?? 0) * pro.ratingCount + proRating) / newCount;
      await tx.pro.update({ where: { id: order.proId }, data: { rating: newAverage, ratingCount: newCount } });
    }

    if (order.riderId && effectiveRiderRating !== null) {
      const rider = await tx.rider.findUnique({ where: { id: order.riderId }, select: { rating: true, ratingCount: true } });
      if (rider) {
        const newCount = rider.ratingCount + 1;
        const newAverage = (Number(rider.rating ?? 0) * rider.ratingCount + effectiveRiderRating) / newCount;
        await tx.rider.update({ where: { id: order.riderId }, data: { rating: newAverage, ratingCount: newCount } });
      }
    }

    return created;
  });

  return NextResponse.json({ review }, { status: 201 });
}

async function getHandler(req: NextRequest, ctx: { params: { orderId: string } }) {
  const auth = await requireAuth(req, [UserRole.CLIENT]);

  const client = await prisma.client.findUnique({ where: { userId: auth.userId } });
  if (!client) {
    throw new ApiError(404, "Profil client introuvable.");
  }

  const review = await prisma.review.findUnique({ where: { orderId: ctx.params.orderId } });
  if (review && review.clientId !== client.id) {
    // Ne devrait jamais arriver (orderId appartient toujours à un seul
    // client), mais on ne renvoie jamais l'avis d'un autre client par sécurité.
    throw new ApiError(404, "Avis introuvable.");
  }

  return NextResponse.json({ review: review ?? null });
}

export const POST = withErrorHandling(postHandler);
export const GET = withErrorHandling(getHandler);