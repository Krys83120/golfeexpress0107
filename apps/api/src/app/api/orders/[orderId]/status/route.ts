import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { updateOrderStatusSchema } from "@/lib/validation/orders";
import { canTransition, isTransitionAllowedForRole } from "@/lib/orderStateMachine";

/**
 * PATCH /api/orders/[orderId]/status
 *
 * Fait avancer le statut d'une commande, en validant :
 *  1. que la transition est possible depuis le statut actuel (machine à états)
 *  2. que le rôle de l'appelant a le droit de déclencher cette transition
 *  3. que l'appelant est bien partie prenante de cette commande précise
 *     (le Pro de cette commande, le Rider qui lui est assigné, etc.)
 *
 * Body: { status: OrderStatus, note?: string }
 *
 * Les apps n'ont rien d'autre à faire pour le temps réel : Supabase Realtime
 * (postgres_changes sur la table Order) notifie automatiquement les clients
 * abonnés dès que cette route met à jour la ligne.
 */
async function patchHandler(req: NextRequest, ctx: { params: { orderId: string } }) {
  const auth = await requireAuth(req);

  const body = await req.json().catch(() => null);
  const parsed = updateOrderStatusSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const { status: nextStatus, note } = parsed.data;

  const order = await prisma.order.findUnique({ where: { id: ctx.params.orderId } });
  if (!order) {
    throw new ApiError(404, "Commande introuvable.");
  }

  // Vérifie que l'appelant est bien partie prenante de CETTE commande,
  // pas seulement qu'il a le bon rôle en général.
  if (auth.role === UserRole.PRO) {
    const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
    if (!pro || pro.id !== order.proId) {
      throw new ApiError(403, "Cette commande n'appartient pas à votre boutique.");
    }
  } else if (auth.role === UserRole.RIDER) {
    const rider = await prisma.rider.findUnique({ where: { userId: auth.userId } });
    if (!rider || rider.id !== order.riderId) {
      throw new ApiError(403, "Cette commande ne vous est pas assignée.");
    }
  } else if (auth.role === UserRole.CLIENT) {
    const client = await prisma.client.findUnique({ where: { userId: auth.userId } });
    if (!client || client.id !== order.clientId) {
      throw new ApiError(403, "Cette commande ne vous appartient pas.");
    }
    // Un client ne peut déclencher que l'annulation, jamais les autres transitions.
    if (nextStatus !== OrderStatus.CANCELLED) {
      throw new ApiError(403, "Seule l'annulation est autorisée depuis l'app Client.");
    }
  }
  // ADMIN / SUPER_ADMIN : peuvent intervenir sur n'importe quelle commande.

  const currentStatus = order.status as OrderStatus;

  if (!canTransition(currentStatus, nextStatus)) {
    throw new ApiError(400, `Transition impossible: ${currentStatus} -> ${nextStatus}.`);
  }

  if (!isTransitionAllowedForRole(nextStatus, auth.role)) {
    throw new ApiError(403, "Votre rôle ne permet pas cette transition.");
  }

  const timestampField: Partial<Record<OrderStatus, string>> = {
    [OrderStatus.CONFIRMED]: "acceptedAt",
    [OrderStatus.READY]: "readyAt",
    [OrderStatus.PICKED_UP]: "pickedUpAt",
    [OrderStatus.DELIVERED]: "deliveredAt",
  };
  const extraField = timestampField[nextStatus];

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: nextStatus,
      ...(extraField ? { [extraField]: new Date() } : {}),
      statusHistory: {
        create: { status: nextStatus, changedBy: auth.userId, note },
      },
    },
    include: { items: true, statusHistory: { orderBy: { changedAt: "asc" } } },
  });

  return NextResponse.json({ order: updated });
}

export const PATCH = withErrorHandling(patchHandler);
