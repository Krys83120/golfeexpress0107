import type { Stripe } from "@stripe/stripe-js";

/**
 * Instance Stripe.js partagée (chargée une seule fois), même principe que
 * apps/client/src/services/stripeClient.ts -- ici pas besoin de vérifier
 * Platform.OS puisque l'espace Pro est une app web pure (Vite), jamais
 * embarquée dans un contexte React Native natif.
 *
 * La clé publique (pk_live_... ou pk_test_...) n'est PAS sensible -- conçue
 * pour être exposée côté client, exactement comme elle apparaît déjà en
 * clair dans le Dashboard Stripe. Doit être définie comme
 * VITE_STRIPE_PUBLISHABLE_KEY dans les Environment Variables du projet
 * Vercel golfeexpress0107-pro (préfixe VITE_ obligatoire pour qu'une
 * variable d'environnement soit exposée au code client par Vite) -- même
 * valeur que EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY déjà utilisée côté Client.
 */
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
    if (!publishableKey) {
      console.error(
        "VITE_STRIPE_PUBLISHABLE_KEY manquante -- le paiement par carte est indisponible tant que cette variable n'est pas configurée dans les Environment Variables du projet Vercel."
      );
      return Promise.resolve(null);
    }
    // Import dynamique : même raison que côté Client, évite de charger le
    // script externe Stripe.js tant qu'on n'en a pas réellement besoin.
    stripePromise = import("@stripe/stripe-js").then(({ loadStripe }) => loadStripe(publishableKey));
  }
  return stripePromise;
}
