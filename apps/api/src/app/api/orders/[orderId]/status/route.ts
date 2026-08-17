import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { updateOrderStatusSchema } from "@/lib/validation/orders";
import { canTransition, isTransitionAllowedForRole } from "@/lib/orderStateMachine";
import { stripe } from "@/lib/stripe";
import {
  sendOrderPreparingEmail,
  sendOrderOnTheWayEmail,
  sendOrderDeliveredEmail,
  sendOrderCancelledEmail,
  sendOrderCancelledByClientToProEmail,
} from "@/lib/emails/orderEmails";
import { sendTransferFailedAlert } from "@/lib/emails/adminEmails";

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

// Fenêtre de livraison cible une fois la commande récupérée par le livreur
// (déclenche le compte à rebours affiché côté app Livreur — voir
// CurrentDeliveryCard.tsx) et seuils de pénalité en cas de retard. Comme
// SERVICE_FEE dans orders/route.ts : codé en dur pour ce premier jet, à
// terme remplacer par une lecture de GlobalSetting pour rester réglable
// depuis l'admin sans redéploiement.
const DELIVERY_WINDOW_MINUTES = 30;
const LATE_GRACE_MINUTES = 10;
const LATE_PENALTY_AMOUNT = 2;

async function patchHandler(req: NextRequest, ctx: { params: { orderId: string } }) {
  const auth = await requireAuth(req);

  const body = await req.json().catch(() => null);
  const parsed = updateOrderStatusSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const { status: nextStatus, note, estimatedPrepMinutes, deliveryPhoto, deliveryCode } = parsed.data;

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
  // Retard de livraison — comparé à estimatedDelivery (posé au passage
  // PICKED_UP, voir plus bas) avec une marge de grâce avant pénalité.
  // latePenaltyApplied protège contre un double décompte si cette route
  // était rappelée par erreur sur une commande déjà livrée.
  const isLateDelivery =
    nextStatus === OrderStatus.DELIVERED &&
    order.estimatedDelivery !== null &&
    !order.latePenaltyApplied &&
    Date.now() > new Date(order.estimatedDelivery).getTime() + LATE_GRACE_MINUTES * 60_000;
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
        // Démarre le compte à rebours de livraison dès la récupération
        // (essentiel pour la chaîne du froid/chaud) — affiché en direct
        // côté app Livreur (CurrentDeliveryCard.tsx) et comparé à
        // deliveredAt plus haut (isLateDelivery) pour détecter un retard.
        ...(nextStatus === OrderStatus.PICKED_UP
          ? { estimatedDelivery: new Date(Date.now() + DELIVERY_WINDOW_MINUTES * 60_000) }
          : {}),
        // Preuve de remise, fournie par le Rider en marquant la commande
        // livrée — les deux restent optionnelles (voir updateOrderStatusSchema).
        ...(nextStatus === OrderStatus.DELIVERED
          ? {
              deliveryPhoto: deliveryPhoto ?? undefined,
              deliveryCode: deliveryCode ?? undefined,
              ...(isLateDelivery ? { latePenaltyApplied: true } : {}),
            }
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

        // Pénalité de retard — chaîne du froid/chaud (voir demande
        // produit). Volontairement une ligne de solde séparée, jamais une
        // réduction du virement Stripe déjà calculé ci-dessus : reste
        // simple et sûr même si riderReadyForPayout est vrai (le virement
        // automatique part alors pour le montant plein) — la pénalité vient
        // en déduction du PROCHAIN solde/retrait plutôt que de risquer un
        // virement Stripe à montant négatif ou partiel.
        if (isLateDelivery) {
          await tx.earning.create({
            data: {
              riderId: result.riderId,
              orderId: result.id,
              amount: -LATE_PENALTY_AMOUNT,
              type: "PENALTY",
              status: "AVAILABLE",
            },
          });
          await tx.rider.update({
            where: { id: result.riderId },
            data: { balance: { decrement: LATE_PENALTY_AMOUNT } },
          });
        }
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
        sendTransferFailedAlert(
          "pro",
          updated.orderNumber,
          Number(updated.proEarnings),
          err instanceof Error ? err.message : "Erreur inconnue"
        ).catch(() => {});
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
        sendTransferFailedAlert(
          "rider",
          updated.orderNumber,
          Number(updated.riderEarnings),
          err instanceof Error ? err.message : "Erreur inconnue"
        ).catch(() => {});
      }
    }
  }

  // Emails "suivi de commande" (client) — best-effort, jamais bloquant.
  // On ne notifie que sur les transitions qui apportent une vraie info
  // utile au client (pas READY/RIDER_ASSIGNED/IN_DELIVERY, redondants avec
  // le suivi en direct dans l'app) pour éviter de le noyer d'emails.
  const EMAIL_NOTIFIED_STATUSES: OrderStatus[] = [
    OrderStatus.PREPARING,
    OrderStatus.PICKED_UP,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
  ];
  if (EMAIL_NOTIFIED_STATUSES.includes(nextStatus)) {
    const [client, pro] = await Promise.all([
      prisma.client.findUnique({ where: { id: updated.clientId }, include: { user: true } }),
      prisma.pro.findUnique({ where: { id: updated.proId } }),
    ]);
    const emailData = {
      orderNumber: updated.orderNumber,
      total: Number(updated.total),
      proBusinessName: pro?.businessName ?? "",
      items: updated.items.map((i) => ({ productName: i.productName, quantity: i.quantity, totalPrice: Number(i.totalPrice) })),
    };

    if (client) {
      if (nextStatus === OrderStatus.PREPARING) {
        sendOrderPreparingEmail(client.user.email, emailData, estimatedPrepMinutes ?? 0).catch((err) =>
          console.error("[order status] Échec email préparation:", err)
        );
      } else if (nextStatus === OrderStatus.PICKED_UP) {
        sendOrderOnTheWayEmail(client.user.email, emailData).catch((err) =>
          console.error("[order status] Échec email en route:", err)
        );
      } else if (nextStatus === OrderStatus.DELIVERED) {
        sendOrderDeliveredEmail(client.user.email, { ...emailData, orderId: updated.id }).catch((err) =>
          console.error("[order status] Échec email livrée:", err)
        );
      } else if (nextStatus === OrderStatus.CANCELLED) {
        const cancelledBy = auth.role === UserRole.CLIENT ? "client" : auth.role === UserRole.PRO ? "pro" : "system";
        sendOrderCancelledEmail(client.user.email, emailData, cancelledBy).catch((err) =>
          console.error("[order status] Échec email annulation:", err)
        );
        // Le Pro est notifié uniquement si c'est le CLIENT qui a annulé —
        // s'il a annulé lui-même, il le sait déjà.
        if (auth.role === UserRole.CLIENT && pro) {
          sendOrderCancelledByClientToProEmail(pro.emailContact, emailData).catch((err) =>
            console.error("[order status] Échec email annulation (pro):", err)
          );
        }
      }
    }
  }

  return NextResponse.json({ order: updated });
}

export const PATCH = withErrorHandling(patchHandler);
