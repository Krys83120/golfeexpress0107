import { stripe } from "@/lib/stripe";

/**
 * URLs de retour après l'onboarding bancaire Stripe (hébergé par Stripe,
 * on n'affiche jamais nous-mêmes un formulaire d'IBAN). Surchargeables via
 * variables d'env si un jour les domaines changent, mais les valeurs par
 * défaut correspondent aux apps réellement déployées.
 */
const PRO_APP_URL = process.env.STRIPE_CONNECT_RETURN_URL_PRO ?? "https://pro.doyougeckoo.fr";
const RIDER_APP_URL = process.env.STRIPE_CONNECT_RETURN_URL_RIDER ?? "https://livreur.doyougeckoo.fr";

export type ConnectAccountKind = "pro" | "rider";

/**
 * Crée (si besoin) un compte Stripe Connect de type "Express" pour un Pro
 * ou un Rider, puis génère un lien d'inscription hébergé par Stripe
 * (formulaire d'identité + coordonnées bancaires — jamais géré par nous).
 *
 * Idempotent : si un stripeAccountId existe déjà, on le réutilise et on
 * génère juste un nouveau lien (utile si le précédent a expiré, ou si la
 * personne veut compléter/corriger des infos).
 */
export async function createOrRefreshOnboardingLink(params: {
  kind: ConnectAccountKind;
  existingAccountId: string | null;
  email: string;
  businessName?: string | null;
}): Promise<{ url: string; accountId: string }> {
  const { kind, existingAccountId, email, businessName } = params;
  const returnBase = kind === "pro" ? PRO_APP_URL : RIDER_APP_URL;

  let accountId = existingAccountId;
  // On ne connaît le VRAI état d'avancement (onboarding fini ou pas) qu'en
  // relisant le compte chez Stripe — un stripeAccountId peut exister sans
  // que l'inscription soit terminée (ex: la personne a fermé l'onglet en
  // cours de route), auquel cas il faut redonner "account_onboarding" et
  // pas "account_update".
  let onboardingComplete = false;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "FR",
      email,
      business_type: "individual",
      ...(businessName ? { business_profile: { name: businessName } } : {}),
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: kind === "pro" },
      },
    });
    accountId = account.id;
  } else {
    const account = await stripe.accounts.retrieve(accountId);
    onboardingComplete = Boolean(account.details_submitted);
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    // refresh_url : Stripe y renvoie si le lien a expiré ou si l'utilisateur
    // a fait retour arrière — on renvoie simplement vers l'app, qui pourra
    // redemander un nouveau lien.
    refresh_url: `${returnBase}?stripe_onboarding=refresh`,
    return_url: `${returnBase}?stripe_onboarding=complete`,
    // "account_onboarding" tant que l'inscription n'est pas finie,
    // "account_update" une fois validée (ex: la personne change de banque)
    // — Stripe refuse account_onboarding sur un compte déjà pleinement
    // vérifié.
    type: onboardingComplete ? "account_update" : "account_onboarding",
  });

  return { url: accountLink.url, accountId };
}

/**
 * Lit le statut réel d'un compte Connect directement depuis l'API Stripe
 * (plus fiable qu'attendre le prochain webhook si l'utilisateur revient
 * juste après avoir terminé l'onboarding).
 */
export async function fetchConnectAccountStatus(accountId: string) {
  const account = await stripe.accounts.retrieve(accountId);
  return {
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    onboardingComplete: Boolean(account.details_submitted),
  };
}
