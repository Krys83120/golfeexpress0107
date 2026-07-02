import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, PaymentStatus } from "@golfeexpress/types";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

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
 *   Events à écouter: payment_intent.succeeded, payment_intent.payment_failed
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
            await prisma.order.update({
              where: { id: orderId },
              data: {
                paymentStatus: PaymentStatus.CAPTURED,
                // On ne fait avancer le statut métier vers CONFIRMED que si
                // la commande était encore PENDING — si le Pro/Rider l'a
                // déjà fait progresser (webhook reçu en retard, replay
                // Stripe...), on ne touche qu'au paymentStatus pour ne pas
                // régresser un statut plus avancé.
                ...(order.status === OrderStatus.PENDING ? { status: OrderStatus.CONFIRMED } : {}),
                statusHistory:
                  order.status === OrderStatus.PENDING
                    ? { create: { status: OrderStatus.CONFIRMED, note: "Paiement confirmé (Stripe)" } }
                    : undefined,
              },
            });
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
