import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, PaymentStatus, SubscriptionType } from "@golfeexpress/types";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmedEmail, sendNewOrderToProEmail, sendOrderRefundedEmail } from "@/lib/emails/orderEmails";
import {
  sendSubscriptionConfirmedEmail,
  sendSubscriptionCancelledEmail,
  sendSubscriptionReactivatedEmail,
} from "@/lib/emails/subscriptionEmails";
import { findPack } from "@/lib/partnerPacks";

/**
 * POST /api/webhooks/stripe
 *
 * Reçoit les events Stripe (paiement réussi, échoué, remboursé...).
 * SÉCURITÉ CRITIQUE : on vérifie la signature `stripe-signature` avant de
 * faire confiance au contenu — sans ça, n'importe qui pourrait POSTer un
 * faux event "payment succeeded" et obtenir une commande gratuite.
 *
 * IMPORTANT: la vérification de signature exige le corps de la requête
 * BRUT (non parsé en JSON) — c'est pourquoi on utilise `req.text()` ici et
 * jamais `req.json()` sur cette route précise.
 *
 * Cette route ne doit pas passer par `requireAuth` : Stripe n'envoie pas de
 * JWT Supabase, l'authenticité de l'appel repose entièrement sur la
 * signature webhook.
 *
 * Configuration requise côté Stripe Dashboard > Webhooks :
 *   URL: https://<votre-domaine>/api/webhooks/stripe
 *   Events à écouter: payment_intent.succeeded, payment_intent.payment_failed,
 *     charge.refunded, checkout.session.completed, customer.subscription.updated,
 *     customer.subscription.deleted
 *   Périmètre de destination : "Votre compte" (pas "Comptes connectés")
 *
 * Les 3 derniers events (checkout.session.completed, customer.subscription.*)
 * pilotent l'abonnement aux packs partenaires (voir /api/pros/me/subscription/*
 * et lib/partnerPacks.ts) — même endpoint/secret que les paiements de
 * commandes puisqu'ils appartiennent au même périmètre "Votre compte".
 *
 * NOTE: l'event account.updated (statut onboarding Stripe Connect des
 * Pro/Rider) est géré par une route SÉPARÉE : webhooks/stripe-connect. Ce
 * n'est pas un choix arbitraire — Stripe achemine les events "Comptes
 * connectés" et "Votre compte" vers des destinations distinctes, chacune
 * avec sa propre clé de signature ; les mélanger dans un seul endpoint
 * casserait la vérification de signature pour l'un des deux types d'event.
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Signature webhook manquante." }, { status: 400 });
  }

  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe webhook] Signature invalide:", err);
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as { id: string; metadata: Record<string, string> };
        const orderId = paymentIntent.metadata.orderId;
        if (orderId) {
          const order = await prisma.order.findUnique({ where: { id: orderId } });
          if (order) {
            const wasPending = order.status === OrderStatus.PENDING;
            await prisma.order.update({
              where: { id: orderId },
              data: {
                paymentStatus: PaymentStatus.CAPTURED,
                // On ne fait avancer le statut métier vers CONFIRMED que si
                // la commande était encore PENDING — si le Pro/Rider l'a
                // déjà fait progresser (webhook reçu en retard, replay
                // Stripe...), on ne touche qu'au paymentStatus pour ne pas
                // régresser un statut plus avancé.
                ...(wasPending ? { status: OrderStatus.CONFIRMED } : {}),
                statusHistory:
                  wasPending
                    ? { create: { status: OrderStatus.CONFIRMED, note: "Paiement confirmé (Stripe)" } }
                    : undefined,
              },
            });

            // Emails "commande confirmée" (client) + "nouvelle commande"
            // (pro) — uniquement au premier passage en CONFIRMED, jamais
            // en cas de replay/retry Stripe sur un webhook déjà traité.
            if (wasPending) {
              const [client, pro] = await Promise.all([
                prisma.client.findUnique({ where: { id: order.clientId }, include: { user: true } }),
                prisma.pro.findUnique({ where: { id: order.proId } }),
              ]);
              const emailData = { orderNumber: order.orderNumber, total: Number(order.total), proBusinessName: pro?.businessName ?? "" };
              if (client) {
                sendOrderConfirmedEmail(client.user.email, emailData).catch((err) =>
                  console.error("[stripe webhook] Échec email confirmation client:", err)
                );
              }
              if (pro) {
                sendNewOrderToProEmail(
                  pro.emailContact,
                  emailData,
                  client ? `${client.user.firstName} ${client.user.lastName}` : "Client"
                ).catch((err) => console.error("[stripe webhook] Échec email nouvelle commande pro:", err));
              }
            }
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as { id: string; metadata: Record<string, string> };
        const orderId = paymentIntent.metadata.orderId;
        if (orderId) {
          await prisma.order.update({
            where: { id: orderId },
            data: { paymentStatus: PaymentStatus.FAILED },
          });
        }
        break;
      }

      case "charge.refunded": {
        // metadata.orderId vit sur le PaymentIntent, pas directement sur le
        // Charge (Stripe ne les copie pas automatiquement) — on doit donc
        // relire le PaymentIntent associé pour retrouver la commande.
        const charge = event.data.object as { payment_intent: string | null; amount_refunded: number };
        if (charge.payment_intent) {
          const paymentIntent = await stripe.paymentIntents.retrieve(charge.payment_intent);
          const orderId = paymentIntent.metadata.orderId;
          if (orderId) {
            const order = await prisma.order.findUnique({ where: { id: orderId } });
            if (order) {
              await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: PaymentStatus.REFUNDED } });
              const client = await prisma.client.findUnique({ where: { id: order.clientId }, include: { user: true } });
              const pro = await prisma.pro.findUnique({ where: { id: order.proId } });
              if (client) {
                sendOrderRefundedEmail(
                  client.user.email,
                  { orderNumber: order.orderNumber, total: Number(order.total), proBusinessName: pro?.businessName ?? "" },
                  charge.amount_refunded / 100
                ).catch((err) => console.error("[stripe webhook] Échec email remboursement:", err));
              }
            }
          }
        }
        break;
      }

      case "checkout.session.completed": {
        // Déclenché à la toute fin d'une souscription réussie à un pack
        // partenaire payant (voir /api/pros/me/subscription/checkout) —
        // c'est LE SEUL endroit où on fait effectivement passer le Pro sur
        // son nouveau pack, jamais côté route checkout elle-même (on ne
        // fait confiance qu'à un event Stripe signé, pas à un simple retour
        // navigateur qui pourrait être trafiqué ou jamais atteint).
        const session = event.data.object as {
          mode: string;
          subscription: string | null;
          metadata: Record<string, string> | null;
        };
        if (session.mode === "subscription" && session.subscription) {
          const proId = session.metadata?.proId;
          const tier = session.metadata?.tier as SubscriptionType | undefined;
          if (proId && tier) {
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
            const pack = await findPack(tier);
            const periodStart = new Date(subscription.current_period_start * 1000);
            const periodEnd = new Date(subscription.current_period_end * 1000);
            const updatedPro = await prisma.pro.update({
              where: { id: proId },
              data: {
                subscriptionType: tier,
                subscriptionStatus: subscription.status,
                subscriptionExpiry: periodEnd,
                subscriptionCurrentPeriodStart: periodStart,
                subscriptionCancelAtPeriodEnd: false,
                stripeSubscriptionId: subscription.id,
                // Reprend la commission définie sur le pack au moment de la
                // souscription — si l'admin baisse encore la commission
                // plus tard, ça ne s'applique qu'aux nouvelles
                // souscriptions/renouvellements, jamais rétroactivement.
                ...(pack ? { commissionRate: pack.commissionRate } : {}),
              },
            });

            // Email de "prise en compte" avec récapitulatif (pack, prix,
            // commission, durée de validité) — distinct du reçu de paiement
            // automatique envoyé par Stripe.
            if (pack) {
              sendSubscriptionConfirmedEmail(updatedPro.emailContact, {
                businessName: updatedPro.businessName,
                packName: pack.name,
                priceMonthly: pack.priceMonthly,
                commissionRate: pack.commissionRate,
                periodStart: periodStart.toISOString(),
                periodEnd: periodEnd.toISOString(),
              }).catch((err) => console.error("[stripe webhook] Échec email confirmation abonnement:", err));
            }
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        // Couvre à la fois les renouvellements normaux (juste une nouvelle
        // date de fin de période), les échecs de paiement en cascade
        // (Stripe fait passer le statut par plusieurs valeurs avant
        // "unpaid" en cas d'échecs répétés de la carte), ET les
        // résiliations/réactivations (cancel_at_period_end qui bascule) —
        // que ce soit via nos routes dédiées /subscription/cancel|reactivate
        // ou directement depuis le Billing Portal Stripe.
        const subscription = event.data.object as {
          id: string;
          status: string;
          current_period_start: number;
          current_period_end: number;
          cancel_at_period_end: boolean;
          metadata: Record<string, string> | null;
        };
        const proId = subscription.metadata?.proId;
        if (proId) {
          const TERMINAL_STATUSES = ["canceled", "unpaid", "incomplete_expired"];
          if (TERMINAL_STATUSES.includes(subscription.status)) {
            const freePack = await findPack(SubscriptionType.FREE);
            await prisma.pro.update({
              where: { id: proId },
              data: {
                subscriptionType: SubscriptionType.FREE,
                subscriptionStatus: subscription.status,
                commissionRate: freePack?.commissionRate ?? 0.15,
              },
            });
          } else {
            // On relit l'état AVANT modification pour détecter une
            // transition de cancel_at_period_end (résiliation demandée /
            // annulée) et savoir quel email envoyer — sans ça, impossible
            // de distinguer "vient d'être résilié" d'un simple
            // renouvellement normal qui touche aussi ce webhook.
            const existingPro = await prisma.pro.findUnique({ where: { id: proId } });
            const periodEnd = new Date(subscription.current_period_end * 1000);

            const updatedPro = await prisma.pro.update({
              where: { id: proId },
              data: {
                subscriptionStatus: subscription.status,
                subscriptionExpiry: periodEnd,
                subscriptionCurrentPeriodStart: new Date(subscription.current_period_start * 1000),
                subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end,
              },
            });

            const justCancelled = existingPro && !existingPro.subscriptionCancelAtPeriodEnd && subscription.cancel_at_period_end;
            const justReactivated = existingPro?.subscriptionCancelAtPeriodEnd && !subscription.cancel_at_period_end;

            if (justCancelled || justReactivated) {
              // Prisma type son propre enum séparément de celui de
              // @golfeexpress/types (mêmes valeurs, types distincts pour
              // TypeScript) — même correctif que `user.role as UserRole`
              // dans middleware/auth.ts.
              const pack = await findPack(updatedPro.subscriptionType as SubscriptionType);
              if (pack) {
                if (justCancelled) {
                  sendSubscriptionCancelledEmail(updatedPro.emailContact, {
                    businessName: updatedPro.businessName,
                    packName: pack.name,
                    effectiveDate: periodEnd.toISOString(),
                  }).catch((err) => console.error("[stripe webhook] Échec email résiliation abonnement:", err));
                } else {
                  sendSubscriptionReactivatedEmail(updatedPro.emailContact, {
                    businessName: updatedPro.businessName,
                    packName: pack.name,
                    nextRenewalDate: periodEnd.toISOString(),
                  }).catch((err) => console.error("[stripe webhook] Échec email réactivation abonnement:", err));
                }
              }
            }
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        // Résiliation confirmée (fin de période après annulation, ou
        // résiliation immédiate depuis le Billing Portal) — retour complet
        // au pack FREE et à sa commission par défaut.
        const subscription = event.data.object as { id: string; metadata: Record<string, string> | null };
        const proId = subscription.metadata?.proId;
        if (proId) {
          const freePack = await findPack(SubscriptionType.FREE);
          await prisma.pro.update({
            where: { id: proId },
            data: {
              subscriptionType: SubscriptionType.FREE,
              subscriptionStatus: "canceled",
              subscriptionExpiry: null,
              subscriptionCurrentPeriodStart: null,
              subscriptionCancelAtPeriodEnd: false,
              stripeSubscriptionId: null,
              commissionRate: freePack?.commissionRate ?? 0.15,
            },
          });
        }
        break;
      }

      case "account.updated": {
        // Ne devrait jamais arriver ici avec la config recommandée (voir
        // webhooks/stripe-connect) mais on l'ignore proprement si jamais
        // ce endpoint reçoit quand même cet event un jour (config Stripe
        // différente) plutôt que de planter.
        break;
      }

      default:
        // Events non gérés explicitement — on les ignore sans erreur, c'est
        // le comportement attendu par Stripe (acquitter avec un 200).
        break;
    }
  } catch (err) {
    console.error("[stripe webhook] Erreur traitement event:", err);
    // On renvoie 200 quand même pour éviter que Stripe ne réessaie en boucle
    // une erreur applicative qui ne se résoudra pas toute seule ; l'erreur
    // est loguée pour investigation manuelle.
  }

  return NextResponse.json({ received: true });
}
