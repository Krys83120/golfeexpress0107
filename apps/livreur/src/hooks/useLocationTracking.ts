import { useEffect, useRef } from "react";
import * as Location from "expo-location";
import { updateLocation } from "@/services/ridersApi";
import { useRiderSessionStore } from "@/store/useRiderSessionStore";

const UPDATE_INTERVAL_MS = 15000; // 15s — cohérent avec le rafraîchissement de la carte admin
const MIN_DISTANCE_METERS = 20; // évite de spammer l'API si le livreur est à l'arrêt

/**
 * Tant que le livreur est en ligne, suit sa position GPS et l'envoie
 * périodiquement au serveur (PATCH /api/riders/me/location) — c'est cette
 * position qui alimente la carte live admin et le suivi client. Sans ce
 * hook, `currentLat`/`currentLng` ne sont jamais mis à jour après le
 * passage en ligne.
 *
 * À placer une seule fois, au niveau racine de l'app (dans MainApp), pour
 * qu'il continue de tourner peu importe l'onglet actif.
 */
export function useLocationTracking() {
  const isOnline = useRiderSessionStore((s) => s.isOnline);
  const activeDelivery = useRiderSessionStore((s) => s.activeDelivery);
  const watchSubscription = useRef<Location.LocationSubscription | null>(null);
  // Toujours lire la commande active à jour dans le callback GPS, qui est
  // enregistré une seule fois (effet dépendant uniquement de `isOnline`) et
  // capturerait sinon une valeur figée au moment du passage en ligne.
  const activeDeliveryRef = useRef(activeDelivery);
  activeDeliveryRef.current = activeDelivery;

  useEffect(() => {
    if (!isOnline) {
      watchSubscription.current?.remove();
      watchSubscription.current = null;
      return;
    }

    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || cancelled) return;

      watchSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: UPDATE_INTERVAL_MS,
          distanceInterval: MIN_DISTANCE_METERS,
        },
        (position) => {
          updateLocation(
            position.coords.latitude,
            position.coords.longitude,
            activeDeliveryRef.current?.id
          ).catch(() => {
            // Échec silencieux — la position sera simplement mise à jour
            // au prochain point GPS reçu, pas besoin de bloquer/alerter
            // le livreur pour un souci réseau ponctuel.
          });
        }
      );
    })();

    return () => {
      cancelled = true;
      watchSubscription.current?.remove();
      watchSubscription.current = null;
    };
  }, [isOnline]);
}
