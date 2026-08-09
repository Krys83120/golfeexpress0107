import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/orders/[orderId]/mark-ready
 *
 * Marque une commande comme physiquement prête (readyAt) SANS
 * nécessairement changer son `status`. Nécessaire pour le cas où un
 * livreur a déjà été assigné pendant la préparation (status déjà passé à
 * RIDER_ASSIGNED) : le Pro doit pouvoir signaler "c'est prêt, tu peux
 * venir chercher" sans repasser par une transition de statut qui n'a plus
 * de sens dans ce cas (RIDER_ASSIGNED -> READY casserait la machine à
 * états, qui traite RIDER_ASSIGNED comme postérieur à READY dans le flux
 * "classique" sans recherche anticipée).
 *
 * Pour le cas classique (aucun livreur assigné, status encore PREPARING),
 * on redirige simplement vers la transition PREPARING -> READY existante
 * via PATCH .../status, qui pose déjà readyAt automatiquement.
 */
async function patchHandler(req: NextRequest, ctx: { params: { orderId: string } }) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }

  const order = await prisma.order.findUnique({ where: { id: ctx.params.orderId } });
  if (!order) {
    throw new ApiError(404, "Commande introuvable.");
  }
  if (order.proId !== pro.id) {
    throw new ApiError(403, "Cette commande n'appartient pas à votre boutique.");
  }
  if (order.status !== OrderStatus.RIDER_ASSIGNED) {
    throw new ApiError(
      400,
      "Cette action n'est utile que lorsqu'un livreur est déjà assigné — sinon, utilisez l'action \"Marquer comme prête\" habituelle."
    );
  }
  if (order.readyAt) {
    throw new ApiError(400, "Cette commande est déjà marquée comme prête.");
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      readyAt: new Date(),
      statusHistory: {
        create: { status: order.status, changedBy: auth.userId, note: "Marquée prête (livreur déjà assigné)" },
      },
    },
    include: { items: true, statusHistory: { orderBy: { changedAt: "asc" } } },
  });

  return NextResponse.json({ order: updated });
}

export const PATCH = withErrorHandling(patchHandler);
