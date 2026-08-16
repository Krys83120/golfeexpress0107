import { NextRequest, NextResponse } from "next/server";
import { UserRole, SubscriptionType } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { findPack } from "@/lib/partnerPacks";

/**
 * Même variable d'env que apps/api/src/lib/stripeConnect.ts (réutilisée
 * telle quelle, pas de nouvelle variable à ajouter) — l'app Pro n'a qu'un
 * seul domaine de retour, que ce soit pour l'onboarding bancaire Connect ou
 * pour la souscription à un pack partenaire.
 */
const PRO_APP_URL = process.env.STRIPE_CONNECT_RETURN_URL_PRO ?? "https://pro.doyougeckoo.fr";

/**
 * POST /api/pros/me/subscription/checkout
 * Body: { tier: "PREMIUM"|"PREMIUM_PLUS" }
 *
 * Crée (ou réutilise) le Customer Stripe du Pro puis une Checkout Session en
 * mode abonnement pour le pack demandé. Le passage effectif au nouveau pack
 * n'a lieu qu'à la réception du webhook `checkout.session.completed` (voir
 * /api/webhooks/stripe) — jamais ici — pour ne jamais faire confiance à un
 * simple retour navigateur.
 */
async function postHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const body = await req.json().catch(() => null);
  const tier = body?.tier;
  if (tier !== SubscriptionType.PREMIUM && tier !== SubscriptionType.PREMIUM_PLUS) {
    throw new ApiError(400, "Pack invalide — seuls les packs payants nécessitent une souscription.");
  }

  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }

  const pack = await findPack(tier);
  if (!pack || !pack.stripePriceId) {
    throw new ApiError(400, "Ce pack n'est pas encore disponible à la souscription, contactez le support.");
  }

  let customerId = pro.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: pro.emailContact,
      name: pro.businessName,
      metadata: { proId: pro.id },
    });
    customerId = customer.id;
    await prisma.pro.update({ where: { id: pro.id }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: pack.stripePriceId, quantity: 1 }],
    // metadata sur la session ET sur l'abonnement lui-même : le webhook
    // checkout.session.completed lit celle de la session, mais les webhooks
    // customer.subscription.updated/deleted (déclenchés bien plus tard,
    // sans lien direct avec la session d'origine) n'ont que celle de
    // l'abonnement — voir /api/webhooks/stripe.
    metadata: { proId: pro.id, tier },
    subscription_data: { metadata: { proId: pro.id, tier } },
    success_url: `${PRO_APP_URL}/?subscription=success`,
    cancel_url: `${PRO_APP_URL}/?subscription=cancel`,
  });

  if (!session.url) {
    throw new ApiError(500, "Impossible de créer la session de paiement, réessayez.");
  }

  return NextResponse.json({ url: session.url });
}

export const POST = withErrorHandling(postHandler);
