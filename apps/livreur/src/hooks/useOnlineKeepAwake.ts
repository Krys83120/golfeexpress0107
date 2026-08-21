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
export function useOnlineKeepAwake() {
  const isOnline = useRiderSessionStore((s) => s.isOnline);

  useEffect(() => {
    if (isOnline) {
      activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {
        // Non bloquant (ex: Wake Lock API non supportée sur ce navigateur) —
        // voir isAvailableAsync() dans expo-keep-awake si un jour on veut
        // avertir l'utilisateur plutôt que d'échouer silencieusement.
      });
    } else {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    }

    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [isOnline]);
}
