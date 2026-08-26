import { useEffect } from "react";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useRiderSessionStore } from "@/store/useRiderSessionStore";

const KEEP_AWAKE_TAG = "rider-online";

/**
 * Empêche l'écran de se verrouiller tant que le livreur est "en ligne" —
 * pas seulement pendant une livraison en cours (voir déjà useKeepAwake()
 * dans CurrentDeliveryCard.tsx, qui ne couvre que ce cas-là). Sans ça, le
 * verrouillage de l'écran pendant l'attente d'une commande coupe le suivi
 * GPS (useLocationTracking) et le polling des commandes disponibles
 * (HomeScreen), ce qui donnait l'impression que le livreur "repassait hors
 * ligne tout seul" au réveil du téléphone.
 *
 * À placer une seule fois, au niveau racine de l'app (voir App.tsx) —
 * utilise un tag distinct de celui de CurrentDeliveryCard pour que les deux
 * verrous coexistent sans se marcher dessus.
 */
// `activateKeepAwakeAsync`/`deactivateKeepAwake` sont typées comme
// retournant une Promise, mais sur le Wake Lock API web (utilisé par
// l'export web/PWA de cette app), relâcher un verrou déjà relâché — ou
// alors qu'aucun verrou n'a jamais été pris — peut lever une exception
// *synchrone* plutôt qu'un rejet de Promise. Un simple `.catch()` ne
// protège pas contre ça : une exception synchrone dans un useEffect (ou
// sa fonction de nettoyage) fait planter tout l'arbre React, ce qui
// produit exactement le symptôme observé (écran blanc), faute d'error
// boundary. On enveloppe donc chaque appel dans un try/catch pour ne
// jamais laisser d'exception s'échapper d'ici.
function safeActivate() {
  try {
    Promise.resolve(activateKeepAwakeAsync(KEEP_AWAKE_TAG)).catch(() => {
      // Non bloquant (ex: Wake Lock API non supportée sur ce navigateur) —
      // voir isAvailableAsync() dans expo-keep-awake si un jour on veut
      // avertir l'utilisateur plutôt que d'échouer silencieusement.
    });
  } catch {
    // Non bloquant.
  }
}

function safeDeactivate() {
  try {
    Promise.resolve(deactivateKeepAwake(KEEP_AWAKE_TAG)).catch(() => {});
  } catch {
    // Non bloquant.
  }
}

export function useOnlineKeepAwake() {
  const isOnline = useRiderSessionStore((s) => s.isOnline);

  useEffect(() => {
    if (isOnline) {
      safeActivate();
    }
    // Pas de "else safeDeactivate()" ici : la fonction de nettoyage
    // ci-dessous s'en charge déjà dès que `isOnline` repasse à false (React
    // l'exécute avant de relancer l'effet), donc pas besoin de désactiver
    // une deuxième fois dans le corps de l'effet. Ce double appel coup sur
    // coup (nettoyage + branche "else") était très probablement la cause
    // de l'écran blanc au passage hors ligne : le passage en ligne, lui,
    // ne déclenchait jamais deux appels à deactivateKeepAwake, d'où le
    // bug qui n'apparaissait que dans un sens.
    return () => {
      safeDeactivate();
    };
  }, [isOnline]);
}
