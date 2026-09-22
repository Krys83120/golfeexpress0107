import { NextRequest, NextResponse } from "next/server";
import { UserRole, OrderStatus, PaymentStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import {
  sendOrderConfirmedEmail,
  sendNewOrderToProEmail,
  sendOrderPreparingEmail,
  sendOrderOnTheWayEmail,
  sendOrderDeliveredEmail,
} from "@/lib/emails/orderEmails";
import { sendPushToPro } from "@/lib/webPush";

/**
 * PATCH /api/admin/orders/[orderId]/test-transition
 *
 * Fait avancer manuellement une commande DE TEST (Order.isTest, voir
 * /mark-test) d'une étape à travers un cycle simplifié, pour permettre à
 * Krys de tester de bout en bout les notifications (Pro "nouvelle commande
 * à préparer", Client "commande confirmée/en route/livrée", Rider "commande
 * à proximité") sans jamais engager d'argent réel (demande explicite du
 * 22/09/2026, précisée le même jour : le but est bien de tester les
 * notifications, pas seulement l'affichage du statut).
 *
 * Body: { status: OrderStatus } -- doit être l'étape SUIVANTE immédiate
 * dans TEST_FLOW ci-dessous, jamais un saut.
 *
 * Volontairement un cycle séparé et simplifié de la vraie machine à états
 * (voir apps/api/src/lib/orderStateMachine.ts, TRANSITION_OWNERS/
 * FORWARD_TRANSITIONS, utilisée par la vraie route
 * orders/[orderId]/status/route.ts) :
 *  - RIDER_ASSIGNED/PICKED_UP sont fusionnées dans IN_DELIVERY ("En
 *    livraison") -- inutile de simuler l'acceptation d'un vrai livreur pour
 *    tester le rendu du statut et l'email "commande en route".
 *  - Pas de vérification de rôle "propriétaire de la commande" (Pro/Rider
 *    assignés) : c'est l'Admin qui pilote tout, volontairement.
 *
 * NOTIFICATIONS -- volontairement RÉELLES, mêmes emails que le vrai flux
 * (sendOrderConfirmedEmail/sendNewOrderToProEmail à CONFIRMED,
 * sendOrderPreparingEmail à PREPARING, sendOrderOnTheWayEmail à IN_DELIVERY
 * -- équivalent test de PICKED_UP côté vrai flux, sendOrderDeliveredEmail à
 * DELIVERED), envoyées au vrai email du compte Client/Pro utilisé pour le
 * test. Best-effort, ne bloque jamais la transition si l'envoi échoue.
 * ATTENTION : le contenu de ces emails (ex: "le paiement a bien été
 * accepté") est celui du vrai flux et n'est pas modifié pour le mode test
 * -- à ignorer, aucun paiement n'a réellement eu lieu.
 *
 * PUSH PRO (ajout du 22/09/2026) : à CONFIRMED, envoie aussi la notification
 * push "nouvelle commande" au Pro (voir sendPushToPro, lib/webPush.ts) --
 * exactement le même appel que le vrai webhook Stripe
 * (webhooks/stripe/route.ts), pour permettre à Krys de tester ce canal
 * (reçu même appli Pro fermée) sans avoir à passer une vraie commande.
 *
 * La notification livreur ("commande à proximité") n'a PAS besoin d'être
 * déclenchée ici : elle part automatiquement de
 * GET /api/riders/me/available-orders (voir riderNotifications.ts) dès que
 * cette commande de test passe par status=READY avec une adresse de retrait
 * valide -- exactement le même mécanisme qu'une vraie commande, aucun code
 * séparé nécessaire.
 *
 * SÉCURITÉ CRITIQUE -- ce qui NE SE PRODUIT JAMAIS ici, contrairement à la
 * vraie route de statut :
 *  - Aucun appel Stripe (ni PaymentIntent, ni stripe.transfers.create) --
 *    voir orders/[orderId]/status/route.ts pour le vrai virement Connect
 *    déclenché normalement au passage DELIVERED.
 *  - Aucun Earning créé, aucun solde/totalEarnings Rider ou Pro modifié.
 *  - Aucun point de fidélité crédité au client.
 * Uniquement Order.status/paymentStatus + les horodatages associés, plus
 * une entrée OrderStatusHistory annotée "(TEST)" pour que ce soit visible
 * dans la traçabilité admin.
 *
 * Garde-fou : refuse tout net si order.isTest n'est pas true -- impossible
 * d'utiliser cette route sur une vraie commande, même par erreur.
 */

// Cycle simplifié dédié au mode test -- distinct de FORWARD_TRANSITIONS
// (orderStateMachine.ts) qui reste la référence pour le vrai flux
// Pro/Rider/webhook Stripe.
const TEST_FLOW: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.IN_DELIVERY,
  OrderStatus.DELIVERED,
];

// Temps de préparation "de test" envoyé dans l'email sendOrderPreparingEmail
// -- pas de champ à saisir dans l'UI de test, une valeur fixe suffit.
const TEST_ESTIMATED_PREP_MINUTES = 15;

async function patchHandler(req: NextRequest, ctx: { params: { orderId: string } }) {
  const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  const nextStatus = body?.status as OrderStatus | undefined;
  if (!nextStatus || !TEST_FLOW.includes(nextStatus)) {
    throw new ApiError(400, "Statut cible invalide pour une transition de test.");
  }

  const order = await prisma.order.findUnique({ where: { id: ctx.params.orderId } });
  if (!order) {
    throw new ApiError(404, "Commande introuvable.");
  }

  if (!order.isTest) {
    throw new ApiError(
      400,
      "Cette action n'est possible que sur une commande marquée comme commande de test."
    );
  }

  const currentIndex = TEST_FLOW.indexOf(order.status as OrderStatus);
  const nextIndex = TEST_FLOW.indexOf(nextStatus);
  if (currentIndex === -1 || nextIndex !== currentIndex + 1) {
    const expected = currentIndex === -1 || currentIndex === TEST_FLOW.length - 1 ? null : TEST_FLOW[currentIndex + 1];
    throw new ApiError(
      400,
      expected
        ? `Étape invalide -- l'étape suivante attendue est ${expected}.`
        : "Cette commande de test ne peut plus avancer."
    );
  }

  const timestampField: Partial<Record<OrderStatus, string>> = {
    [OrderStatus.CONFIRMED]: "acceptedAt",
    [OrderStatus.READY]: "readyAt",
    [OrderStatus.DELIVERED]: "deliveredAt",
  };
  const extraField = timestampField[nextStatus];

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: nextStatus,
      // Simule un paiement "capturé" côté affichage UNIQUEMENT -- jamais un
      // vrai PaymentIntent Stripe, voir le commentaire d'en-tête.
      ...(nextStatus === OrderStatus.CONFIRMED ? { paymentStatus: PaymentStatus.CAPTURED } : {}),
      ...(extraField ? { [extraField]: new Date() } : {}),
      statusHistory: {
        create: {
          status: nextStatus,
          changedBy: auth.userId,
          note: "(TEST) Transition manuelle depuis Admin -- aucun paiement/virement réel.",
        },
      },
    },
    include: { items: true },
  });

  // Notifications -- mêmes emails que le vrai flux (voir commentaire
  // d'en-tête), best-effort, jamais bloquant pour la transition elle-même.
  const NOTIFIED_STATUSES: OrderStatus[] = [
    OrderStatus.CONFIRMED,
    OrderStatus.PREPARING,
    OrderStatus.IN_DELIVERY,
    OrderStatus.DELIVERED,
  ];
  if (NOTIFIED_STATUSES.includes(nextStatus)) {
    const [client, pro] = await Promise.all([
      prisma.client.findUnique({ where: { id: updated.clientId }, include: { user: true } }),
      prisma.pro.findUnique({ where: { id: updated.proId } }),
    ]);
    const emailData = {
      orderNumber: updated.orderNumber,
      total: Number(updated.total),
      proBusinessName: pro?.businessName ?? "",
      items: updated.items.map((i) => ({ productName: i.productName, quantity: i.quantity, totalPrice: Number(i.totalPrice) })),
      deliveryCode: updated.deliveryCode,
    };

    if (nextStatus === OrderStatus.CONFIRMED) {
      if (client) {
        sendOrderConfirmedEmail(client.user.email, emailData).catch((err) =>
          console.error("[test-transition] Échec email confirmation (test):", err)
        );
      }
      if (pro) {
        sendNewOrderToProEmail(
          pro.emailContact,
          emailData,
          client ? `${client.user.firstName} ${client.user.lastName}` : "Client"
        ).catch((err) => console.error("[test-transition] Échec email nouvelle commande pro (test):", err));

        // Notification push (ajout du 22/09/2026) -- teste le même envoi
        // que le vrai webhook Stripe (voir webhooks/stripe/route.ts),
        // best-effort, ne bloque jamais la transition de test.
        sendPushToPro(pro.id, {
          title: "🔔 Nouvelle commande !",
          body: `${emailData.orderNumber} -- ${emailData.total.toFixed(2)} € à préparer.`,
          url: "/commandes",
        }).catch((err) => console.error("[test-transition] Échec push nouvelle commande pro (test):", err));
      }
    } else if (nextStatus === OrderStatus.PREPARING && client) {
      sendOrderPreparingEmail(client.user.email, emailData, TEST_ESTIMATED_PREP_MINUTES).catch((err) =>
        console.error("[test-transition] Échec email préparation (test):", err)
      );
    } else if (nextStatus === OrderStatus.IN_DELIVERY && client) {
      // Équivalent test de PICKED_UP côté vrai flux (voir en-tête) --
      // "votre livreur est en route", le point que Krys veut vérifier.
      sendOrderOnTheWayEmail(client.user.email, emailData).catch((err) =>
        console.error("[test-transition] Échec email en route (test):", err)
      );
    } else if (nextStatus === OrderStatus.DELIVERED && client) {
      sendOrderDeliveredEmail(client.user.email, { ...emailData, orderId: updated.id }).catch((err) =>
        console.error("[test-transition] Échec email livrée (test):", err)
      );
    }
  }

  return NextResponse.json({ order: updated });
}

export const PATCH = withErrorHandling(patchHandler);
