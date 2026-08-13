import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/webhooks/stripe-connect
 *
 * Reçoit les events Stripe émis sur le périmètre "Comptes connectés"
 * (Connect) — dans notre cas uniquement account.updated, qui nous informe
 * qu'un Pro ou un Rider a terminé (ou modifié) son inscription bancaire
 * Stripe Express.
 *
 * IMPORTANT : ce endpoint est SÉPARÉ de /api/webhooks/stripe volontairement.
 * Sur le Dashboard Stripe, les events "Votre compte" (paiements clients) et
 * "Comptes connectés" (Connect) sont deux périmètres de destination
 * distincts, chacun avec sa propre clé de signature — on ne peut pas les
 * envoyer vers le même endpoint avec un seul secret de vérification.
 *
 * Configuration côté Stripe Dashboard > Webhooks (Workbench) :
 *   URL: https://<votre-domaine>/api/webhooks/stripe-connect
 *   Périmètre de destination : "Comptes connectés"
 *   Events à écouter: account.updated
 *
 * Le "Signing secret" affiché à la création de CE endpoint précis va dans
 * la variable STRIPE_CONNECT_WEBHOOK_SECRET (différente de
 * STRIPE_WEBHOOK_SECRET, qui reste dédiée à l'autre endpoint).
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Signature webhook manquante." }, { status: 400 });
  }

  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe connect webhook] Signature invalide:", err);
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  try {
    if (event.type === "account.updated") {
      // On ne sait pas d'avance si le compte appartient à un Pro ou un
      // Rider, donc on tente les deux updateMany (l'un des deux ne
      // touchera simplement aucune ligne, ce n'est pas une erreur).
      const account = event.data.object as {
        id: string;
        charges_enabled: boolean;
        payouts_enabled: boolean;
        details_submitted: boolean;
      };

      const data = {
        stripeChargesEnabled: account.charges_enabled,
        stripePayoutsEnabled: account.payouts_enabled,
        stripeOnboardingComplete: account.details_submitted,
      };

      await prisma.pro.updateMany({ where: { stripeAccountId: account.id }, data });
      await prisma.rider.updateMany({ where: { stripeAccountId: account.id }, data });
    }
    // Les autres events éventuels sur ce périmètre sont ignorés sans erreur.
  } catch (err) {
    console.error("[stripe connect webhook] Erreur traitement event:", err);
    // 200 quand même pour éviter que Stripe ne réessaie en boucle une
    // erreur applicative qui ne se résoudra pas toute seule.
  }

  return NextResponse.json({ received: true });
}
