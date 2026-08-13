import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { updateOrderStatusSchema } from "@/lib/validation/orders";
import { canTransition, isTransitionAllowedForRole } from "@/lib/orderStateMachine";
import { stripe } from "@/lib/stripe";

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

  const { status: nextStatus, note, estimatedPrepMinutes } = parsed.data;

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

  // En passant en préparation, le Pro doit indiquer un temps de préparation
  // estimé — c'est ce qui permet de calculer quand ouvrir la recherche de
  // livreur (voir riderSearchWindow.ts) sans attendre que la commande soit
  // officiellement marquée prête.
  if (nextStatus === OrderStatus.PREPARING && !estimatedPrepMinutes) {
    throw new ApiError(400, "Merci d'indiquer un temps de préparation estimé.");
  }

  // Si la commande passe DELIVERED, on regarde AVANT la transaction si le
  // Pro/Rider ont un compte Stripe Connect prêt à recevoir un virement — ça
  // conditionne comment on comptabilise leur gain (voir plus bas).
  let proReadyForPayout = false;
  let riderReadyForPayout = false;
  if (nextStatus === OrderStatus.DELIVERED) {
    const pro = await prisma.pro.findUnique({
      where: { id: order.proId },
      select: { stripeAccountId: true, stripePayoutsEnabled: true },
    });
    proReadyForPayout = Boolean(pro?.stripeAccountId && pro.stripePayoutsEnabled);

    if (order.riderId) {
      const riderAccount = await prisma.rider.findUnique({
        where: { id: order.riderId },
        select: { stripeAccountId: true, stripePayoutsEnabled: true },
      });
      riderReadyForPayout = Boolean(riderAccount?.stripeAccountId && riderAccount.stripePayoutsEnabled);
    }
  }

  // À la livraison : on matérialise le gain du livreur (table Earning) et on
  // crédite son solde + compteurs, et on crédite les points de fidélité du
  // client. Tout se fait dans la même transaction que la mise à jour du
  // statut pour ne jamais avoir un Order DELIVERED sans Earning associé (ou
  // inversement).
  //
  // Le VRAI virement Stripe (argent qui bouge réellement) se fait juste
  // après, hors transaction : un appel réseau à Stripe ne doit jamais
  // rester ouvert dans une transaction DB, et un souci Stripe ponctuel ne
  // doit jamais empêcher de valider la livraison elle-même.
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.order.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        ...(extraField ? { [extraField]: new Date() } : {}),
        ...(nextStatus === OrderStatus.PREPARING
          ? { preparingStartedAt: new Date(), estimatedPrepMinutes }
          : {}),
        statusHistory: {
          create: { status: nextStatus, changedBy: auth.userId, note },
        },
      },
      include: { items: true, statusHistory: { orderBy: { changedAt: "asc" } } },
    });

    if (nextStatus === OrderStatus.DELIVERED) {
      if (result.riderId) {
        await tx.earning.create({
          data: {
            riderId: result.riderId,
            orderId: result.id,
            amount: result.riderEarnings,
            type: "DELIVERY_FEE",
            // Si le virement Stripe automatique va se déclencher juste après
            // (riderReadyForPayout), l'argent part réellement tout de suite
            // : pas la peine de le compter aussi dans le solde "à retirer"
            // manuellement, ça créerait un double comptage. status/paidAt
            // définitifs sont mis à jour juste après le virement Stripe.
            status: riderReadyForPayout ? "PAID" : "AVAILABLE",
          },
        });
        await tx.rider.update({
          where: { id: result.riderId },
          data: {
            // balance : uniquement incrémenté si PAS de virement auto (sinon
            // l'argent a déjà quitté la plateforme, il n'y a rien "à
            // retirer" en plus).
            ...(riderReadyForPayout ? {} : { balance: { increment: result.riderEarnings } }),
            totalEarnings: { increment: result.riderEarnings },
            totalDeliveries: { increment: 1 },
          },
        });
      }

      // 1 point de fidélité par euro dépensé (arrondi à l'entier inférieur) —
      // règle simple, à externaliser vers GlobalSetting si elle doit devenir
      // configurable depuis l'admin.
      const pointsEarned = Math.floor(Number(result.total));
      if (pointsEarned > 0) {
        await tx.client.update({
          where: { id: result.clientId },
          data: { fidelityPoints: { increment: pointsEarned } },
        });
      }
    }

    return result;
  });

  // Virements Stripe Connect réels — best-effort, jamais bloquant. Si l'un
  // des deux échoue (compte Stripe suspendu entre-temps, souci réseau...),
  // la commande reste DELIVERED normalement ; l'argent correspondant reste
  // simplement sur le solde plateforme et pourra être régularisé
  // manuellement (proTransferId/riderTransferId resteront null, visibles
  // depuis l'admin pour repérer les virements en attente).
  if (nextStatus === OrderStatus.DELIVERED) {
    if (proReadyForPayout) {
      try {
        const pro = await prisma.pro.findUnique({ where: { id: updated.proId }, select: { stripeAccountId: true } });
        if (pro?.stripeAccountId) {
          const transfer = await stripe.transfers.create({
            amount: Math.round(Number(updated.proEarnings) * 100),
            currency: "eur",
            destination: pro.stripeAccountId,
            transfer_group: updated.id,
            metadata: { orderId: updated.id, orderNumber: updated.orderNumber, recipient: "pro" },
          });
          await prisma.order.update({ where: { id: updated.id }, data: { proTransferId: transfer.id } });
        }
      } catch (err) {
        console.error(`[stripe connect] Échec virement Pro pour commande ${updated.id}:`, err);
      }
    }

    if (riderReadyForPayout && updated.riderId) {
      try {
        const rider = await prisma.rider.findUnique({ where: { id: updated.riderId }, select: { stripeAccountId: true } });
        if (rider?.stripeAccountId) {
          const transfer = await stripe.transfers.create({
            amount: Math.round(Number(updated.riderEarnings) * 100),
            currency: "eur",
            destination: rider.stripeAccountId,
            transfer_group: updated.id,
            metadata: { orderId: updated.id, orderNumber: updated.orderNumber, recipient: "rider" },
          });
          await prisma.order.update({ where: { id: updated.id }, data: { riderTransferId: transfer.id } });
          await prisma.earning.updateMany({
            where: { orderId: updated.id, riderId: updated.riderId },
            data: { stripeTransferId: transfer.id, paidAt: new Date() },
          });
        }
      } catch (err) {
        console.error(`[stripe connect] Échec virement Rider pour commande ${updated.id}:`, err);
      }
    }
  }

  return NextResponse.json({ order: updated });
}

export const PATCH = withErrorHandling(patchHandler);
