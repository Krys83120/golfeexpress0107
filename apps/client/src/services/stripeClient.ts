import { Platform } from "react-native";
import type { Stripe } from "@stripe/stripe-js";

/**
 * L'app Client est aujourd'hui uniquement diffusée en web (export Expo Web
 * hébergé sur Vercel) — aucun build natif iOS/Android n'est encore publié.
 * @stripe/stripe-js s'appuie sur `document`/`window` (chargement du script
 * Stripe.js), qui n'existent pas dans un contexte natif RN : on ne charge
 * donc ce module (et ne tente jamais d'appeler loadStripe) que sur web, pour
 * ne jamais risquer de crasher un futur build natif qui importerait ce
 * fichier.
 */
let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Renvoie l'instance Stripe.js partagée (chargée une seule fois), ou `null`
 * si on n'est pas sur web ou si la clé publique n'est pas configurée.
 *
 * La clé publique (pk_live_... ou pk_test_...) n'est PAS sensible — elle est
 * conçue pour être exposée côté client, exactement comme elle apparaît déjà
 * en clair dans le Dashboard Stripe.
 */
export function getStripe(): Promise<Stripe | null> {
  if (Platform.OS !== "web") {
    return Promise.resolve(null);
  }
  if (!stripePromise) {
    const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      console.error(
        "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY manquante — le paiement par carte est indisponible tant que cette variable n'est pas configurée (voir .env.example)."
      );
      return Promise.resolve(null);
    }
    // Import dynamique : évite de charger @stripe/stripe-js (et son script
    // externe) sur une plateforme où on sait déjà qu'on ne l'utilisera pas.
    stripePromise = import("@stripe/stripe-js").then(({ loadStripe }) => loadStripe(publishableKey));
  }
  return stripePromise;
}
