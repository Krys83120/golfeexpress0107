import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, UserRole, RiderStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/orders/[orderId]/accept
 *
 * Un Rider accepte une commande prête (status=READY, riderId=null) et se
 * l'assigne. Implémenté comme un update conditionnel atomique (la clause
 * `where` inclut `riderId: null`) pour éviter une race condition si deux
 * livreurs tentent d'accepter la même commande au même instant — seul le
 * premier appel qui arrive en base gagne, le second échoue avec 409.
 */
async function postHandler(req: NextRequest, ctx: { params: { orderId: string } }) {
  const auth = await requireAuth(req, [UserRole.RIDER]);

  const rider = await prisma.rider.findUnique({ where: { userId: auth.userId } });
  if (!rider) {
    throw new ApiError(404, "Profil livreur introuvable.");
  }
  if (rider.status !== RiderStatus.ACTIVE) {
    throw new ApiError(403, "Votre compte livreur n'est pas encore activé.");
  }
  if (!rider.isOnline) {
    throw new ApiError(400, "Vous devez être en ligne pour accepter une commande.");
  }

  const order = await prisma.order.findUnique({ where: { id: ctx.params.orderId } });
  if (!order) {
    throw new ApiError(404, "Commande introuvable.");
  }
  if (order.status !== OrderStatus.READY || order.riderId) {
    throw new ApiError(409, "Cette commande n'est plus disponible (déjà prise par un autre livreur).");
  }

  // updateMany avec une clause where stricte = l'équivalent d'un UPDATE ...
  // WHERE id = ? AND rider_id IS NULL atomique côté Postgres. Si un autre
  // rider a accepté entre notre `findUnique` ci-dessus et cet appel,
  // `count` sera 0 et on renvoie 409 plutôt que de désassigner par erreur.
  const result = await prisma.order.updateMany({
    where: { id: order.id, riderId: null, status: OrderStatus.READY },
    data: { status: OrderStatus.RIDER_ASSIGNED, riderId: rider.id },
  });

  if (result.count === 0) {
    throw new ApiError(409, "Cette commande vient d'être prise par un autre livreur.");
  }

  await prisma.orderStatusHistory.create({
    data: { orderId: order.id, status: OrderStatus.RIDER_ASSIGNED, changedBy: auth.userId },
  });

  const updated = await prisma.order.findUnique({
    where: { id: order.id },
    include: { items: true, pro: true, fromAddress: true, toAddress: true },
  });

  return NextResponse.json({ order: updated });
}

export const POST = withErrorHandling(postHandler);
