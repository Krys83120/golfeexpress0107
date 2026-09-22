import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, PaymentStatus, SubscriptionType, ParcelOrderStatus } from "@golfeexpress/types";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmedEmail, sendNewOrderToProEmail, sendOrderRefundedEmail } from "@/lib/emails/orderEmails";
import { sendPushToPro } from "@/lib/webPush";
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
 *
 * COLIS EXPRESS (ajout du 19/09/2026) : payment_intent.succeeded,
 * payment_intent.payment_failed et charge.refunded gèrent maintenant AUSSI
 * les PaymentIntent créés pour une demande Colis Express (metadata.parcelOrderId,
 * voir /api/parcel-orders/payment-intent). Chaque branche ParcelOrder est un
 * simple `if` ajouté À CÔTÉ du `if (orderId)` existant, jamais à l'intérieur
 * -- le code Order d'origine n'est pas modifié.
 *
 * FRAIS STRIPE RÉELS (ajout du 19/09/2026, demande explicite de Krys) : dans
 * payment_intent.succeeded, on va chercher le vrai balance_transaction.fee
 * de la transaction (Order ET ParcelOrder) et on le retire de
 * platformEarnings via un decrement atomique -- avant cet ajout, les frais
 * Stripe (prélevés automatiquement par Stripe sur l'encaissement, la
 * plateforme n'utilisant PAS de comptes Connect pour les paiements entrants,
 * voir lib/stripeConnect.ts) n'étaient jamais reflétés en base :
 * platformEarnings affichait un montant brut, supérieur à ce qui est
 * réellement encaissé. proEarnings et riderEarnings ne sont JAMAIS touchés
 * par cet ajout : leurs virements Stripe Connect (voir
 * orders/[orderId]/status/route.ts) sont des transferts internes qui
 * n'engendrent aucun frais additionnel, donc totalement insensibles aux
 * frais de la charge carte initiale.
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
        const paymentIntent = event.data.object as {
          id: string;
          metadata: Record<string, string>;
          payment_method: string | null;
        };
        const orderId = paymentIntent.metadata.orderId;
        if (orderId) {
          const order = await prisma.order.findUnique({ where: { id: orderId } });
          if (order) {
            const wasPending = order.status === OrderStatus.PENDING;

            // Course possible avec l'annulation automatique des commandes
            // PENDING restées impayées 5 minutes (voir orders/route.ts,
            // cancelStalePendingOrders) : le paiement Stripe finit malgré
            // tout par aboutir juste après que la commande ait déjà été
            // annulée côté plateforme. On ne la fait alors JAMAIS repasser en
            // CONFIRMED (elle n'existe plus pour le Pro), et on rembourse
            // automatiquement plutôt que de laisser paymentStatus passer à
            // CAPTURED sur une commande annulée — ce qui donnerait
            // l'impression, notamment côté Admin, que l'argent a été encaissé
            // pour une commande qui ne sera jamais honorée.
            if (order.status === OrderStatus.CANCELLED) {
              try {
                await stripe.refunds.create({ payment_intent: paymentIntent.id });
                await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: PaymentStatus.REFUNDED } });
              } catch (err) {
                console.error(
                  `[stripe webhook] Échec remboursement auto (commande ${orderId} déjà annulée avant confirmation du paiement):`,
                  err
                );
              }
              break;
            }

            // Marque + 4 derniers chiffres de la carte -- affichés sur le
            // ticket imprimé par le Pro (voir printLabel.ts). Récupération
            // "best effort" : un échec ici ne doit jamais empêcher la
            // confirmation du paiement, on continue simplement sans ces
            // infos (elles resteront à null sur cette commande).
            let cardBrand: string | null = null;
            let cardLast4: string | null = null;
            if (paymentIntent.payment_method) {
              try {
                const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntent.payment_method);
                cardBrand = paymentMethod.card?.brand ?? null;
                cardLast4 = paymentMethod.card?.last4 ?? null;
              } catch (err) {
                console.error(`[stripe webhook] Échec récupération du moyen de paiement (commande ${orderId}):`, err);
              }
            }

            // Frais réels Stripe (demande explicite de Krys, 19/09/2026) --
            // on va chercher le VRAI montant prélevé par Stripe sur cette
            // transaction précise (balance_transaction.fee, en centimes)
            // plutôt que d'estimer un pourcentage fixe : reste exact quel
            // que soit le type de carte (UE/hors UE), une éventuelle
            // conversion de devise, etc. Purement soustractif sur
            // platformEarnings via un decrement atomique -- ne touche JAMAIS
            // proEarnings ni riderEarnings (leur virement Stripe Connect
            // interne, déclenché depuis orders/[orderId]/status/route.ts,
            // n'engendre aucun frais Stripe supplémentaire : seule la charge
            // carte initiale sur le compte plateforme en génère un).
            //
            // IMPORTANT idempotence : contrairement à cardBrand/cardLast4
            // (un simple `set`, sans risque à réécrire plusieurs fois), un
            // `decrement` n'est PAS idempotent -- si Stripe rejoue ce même
            // event (retry réseau, etc.), il ne faut le faire qu'UNE SEULE
            // fois. On se base sur order.paymentStatus AVANT cette mise à
            // jour (alreadyCaptured) plutôt que sur wasPending (qui reflète
            // le statut métier, pas le statut de paiement) : un replay a
            // déjà paymentStatus = CAPTURED de la fois précédente, donc on
            // saute entièrement l'appel Stripe et le decrement.
            const alreadyCaptured = order.paymentStatus === PaymentStatus.CAPTURED;
            let stripeFeeAmount: number | null = null;
            if (!alreadyCaptured) {
              try {
                const fullIntent = (await stripe.paymentIntents.retrieve(paymentIntent.id, {
                  expand: ["latest_charge.balance_transaction"],
                })) as unknown as {
                  latest_charge: { balance_transaction: { fee: number } | string | null } | string | null;
                };
                const charge = fullIntent.latest_charge;
                const balanceTransaction = charge && typeof charge === "object" ? charge.balance_transaction : null;
                if (balanceTransaction && typeof balanceTransaction === "object" && typeof balanceTransaction.fee === "number") {
                  stripeFeeAmount = balanceTransaction.fee / 100;
                }
              } catch (err) {
                console.error(`[stripe webhook] Échec récupération des frais Stripe réels (commande ${orderId}):`, err);
              }
            }

            await prisma.order.update({
              where: { id: orderId },
              data: {
                paymentStatus: PaymentStatus.CAPTURED,
                // Écrit uniquement si on a bien réussi à les récupérer --
                // ne jamais écraser une valeur déjà enregistrée par un
                // "null" en cas d'échec sur un replay/retry du webhook.
                ...(cardBrand ? { cardBrand } : {}),
                ...(cardLast4 ? { cardLast4 } : {}),
                // Uniquement si alreadyCaptured était false ET la
                // récupération a réussi (voir le bloc alreadyCaptured
                // ci-dessus) -- jamais appliqué deux fois sur un replay.
                ...(stripeFeeAmount !== null ? { platformEarnings: { decrement: stripeFeeAmount } } : {}),
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
              const emailData = {
                orderNumber: order.orderNumber,
                total: Number(order.total),
                proBusinessName: pro?.businessName ?? "",
                deliveryCode: order.deliveryCode,
              };
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

                // Notification push "nouvelle commande" (ajout du
                // 22/09/2026, demande de Krys) -- best-effort, pure addition
                // à côté de l'email ci-dessus, ne touche à rien d'autre sur
                // cette route critique. Ne fait rien si le Pro n'a aucun
                // abonnement actif (voir sendPushToPro, lib/webPush.ts).
                sendPushToPro(pro.id, {
                  title: "🔔 Nouvelle commande !",
                  body: `${emailData.orderNumber} -- ${emailData.total.toFixed(2)} € à préparer.`,
                  url: "/commandes",
                }).catch((err) => console.error("[stripe webhook] Échec push nouvelle commande pro:", err));
              }
            }
          }
        }

        // COLIS EXPRESS -- ajout pur (19/09/2026), ne touche jamais à la
        // branche Order ci-dessus. Même logique exactement : paymentStatus
        // -> CAPTURED, status métier -> CONFIRMED uniquement au premier
        // passage (jamais de régression sur replay/retry Stripe), et
        // remboursement automatique si la demande a été annulée par le Pro
        // entre la création du PaymentIntent et la confirmation du paiement.
        const parcelOrderId = paymentIntent.metadata.parcelOrderId;
        if (parcelOrderId) {
          const parcelOrder = await prisma.parcelOrder.findUnique({ where: { id: parcelOrderId } });
          if (parcelOrder) {
            const wasPending = parcelOrder.status === ParcelOrderStatus.PENDING;

            if (parcelOrder.status === ParcelOrderStatus.CANCELLED) {
              try {
                await stripe.refunds.create({ payment_intent: paymentIntent.id });
                await prisma.parcelOrder.update({
                  where: { id: parcelOrderId },
                  data: { paymentStatus: PaymentStatus.REFUNDED },
                });
              } catch (err) {
                console.error(
                  `[stripe webhook] Échec remboursement auto (Colis Express ${parcelOrderId} déjà annulé avant confirmation du paiement):`,
                  err
                );
              }
              break;
            }

            // Marque + 4 derniers chiffres de la carte -- même récupération
            // "best effort" que côté Order (voir plus haut), utile pour un
            // futur reçu/justificatif Colis Express côté Pro.
            let cardBrand: string | null = null;
            let cardLast4: string | null = null;
            if (paymentIntent.payment_method) {
              try {
                const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntent.payment_method);
                cardBrand = paymentMethod.card?.brand ?? null;
                cardLast4 = paymentMethod.card?.last4 ?? null;
              } catch (err) {
                console.error(
                  `[stripe webhook] Échec récupération du moyen de paiement (Colis Express ${parcelOrderId}):`,
                  err
                );
              }
            }

            // Frais réels Stripe -- même logique exacte que côté Order (voir
            // le commentaire détaillé plus haut) : decrement atomique sur
            // platformEarnings à partir du vrai balance_transaction.fee,
            // jamais sur riderEarnings, gardé idempotent via
            // alreadyCaptured pour ne jamais s'appliquer deux fois en cas de
            // replay/retry Stripe.
            const alreadyCaptured = parcelOrder.paymentStatus === PaymentStatus.CAPTURED;
            let stripeFeeAmount: number | null = null;
            if (!alreadyCaptured) {
              try {
                const fullIntent = (await stripe.paymentIntents.retrieve(paymentIntent.id, {
                  expand: ["latest_charge.balance_transaction"],
                })) as unknown as {
                  latest_charge: { balance_transaction: { fee: number } | string | null } | string | null;
                };
                const charge = fullIntent.latest_charge;
                const balanceTransaction = charge && typeof charge === "object" ? charge.balance_transaction : null;
                if (balanceTransaction && typeof balanceTransaction === "object" && typeof balanceTransaction.fee === "number") {
                  stripeFeeAmount = balanceTransaction.fee / 100;
                }
              } catch (err) {
                console.error(
                  `[stripe webhook] Échec récupération des frais Stripe réels (Colis Express ${parcelOrderId}):`,
                  err
                );
              }
            }

            await prisma.parcelOrder.update({
              where: { id: parcelOrderId },
              data: {
                paymentStatus: PaymentStatus.CAPTURED,
                ...(cardBrand ? { cardBrand } : {}),
                ...(cardLast4 ? { cardLast4 } : {}),
                // Idem Order : on ne fait avancer le statut métier vers
                // CONFIRMED que si la demande était encore PENDING -- pas de
                // régression sur replay/retry Stripe.
                ...(wasPending ? { status: ParcelOrderStatus.CONFIRMED } : {}),
                ...(stripeFeeAmount !== null ? { platformEarnings: { decrement: stripeFeeAmount } } : {}),
              },
            });

            // Pas d'email de confirmation dédié Colis Express pour l'instant
            // (aucun template existant côté lib/emails -- MVP paiement,
            // voir la proposition envoyée à Krys) -- la confirmation est
            // visible immédiatement dans l'interface Pro (statut "Payé" +
            // rafraîchissement de la liste des demandes récentes).
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

        // COLIS EXPRESS -- ajout pur, même principe que ci-dessus.
        const parcelOrderId = paymentIntent.metadata.parcelOrderId;
        if (parcelOrderId) {
          await prisma.parcelOrder.update({
            where: { id: parcelOrderId },
            data: { paymentStatus: PaymentStatus.FAILED },
          });
        }
        break;
      }

      case "charge.refunded": {
        // metadata.orderId (ou metadata.parcelOrderId pour Colis Express)
        // vit sur le PaymentIntent, pas directement sur le Charge (Stripe ne
        // les copie pas automatiquement) — on doit donc relire le
        // PaymentIntent associé pour retrouver la commande ou la demande.
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

          // COLIS EXPRESS -- ajout pur, même principe (pas d'email dédié
          // pour l'instant, voir la remarque dans payment_intent.succeeded).
          const parcelOrderId = paymentIntent.metadata.parcelOrderId;
          if (parcelOrderId) {
            const parcelOrder = await prisma.parcelOrder.findUnique({ where: { id: parcelOrderId } });
            if (parcelOrder) {
              await prisma.parcelOrder.update({
                where: { id: parcelOrderId },
                data: { paymentStatus: PaymentStatus.REFUNDED },
              });
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
                commissionRate: freePack?.commissionRate ?? 0.18,
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
              commissionRate: freePack?.commissionRate ?? 0.18,
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
