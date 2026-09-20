import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import { savePushSubscription, deletePushSubscription } from "@/services/ridersApi";

/**
 * Notifications "nouvelle commande à proximité" (ajout du 20/09/2026).
 * Web uniquement : l'app Livreur est consultée depuis le navigateur
 * (livreur.doyougeckoo.fr), pas une vraie app installée depuis un store --
 * voir webPush.ts côté API pour le détail du choix technique (Web Push
 * plutôt qu'Expo Push).
 *
 * Sur iPhone, Safari n'autorise les notifications web QUE si le livreur a
 * fait "Ajouter à l'écran d'accueil" (limitation Apple, iOS 16.4+) -- ce
 * hook ne peut rien y faire de plus que prévenir l'utilisateur (voir
 * RiderProfileScreen.tsx pour le message affiché).
 */

const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;

// Conversion standard clé VAPID (base64url) -> Uint8Array, requise par
// PushManager.subscribe -- voir la doc MDN sur les Web Push API, snippet
// largement repris tel quel dans l'écosystème (rien de spécifique à ce
// projet).
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushSupportState = "unsupported" | "checking" | "granted" | "denied" | "default";

export function usePushNotifications() {
  const [state, setState] = useState<PushSupportState>("checking");

  const isWebSupported =
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    !!VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!isWebSupported) {
      setState("unsupported");
      return;
    }
    setState(Notification.permission === "granted" ? "granted" : Notification.permission === "denied" ? "denied" : "default");
  }, [isWebSupported]);

  /** Demande la permission navigateur + crée/enregistre l'abonnement côté serveur. */
  const enable = useCallback(async (): Promise<boolean> => {
    if (!isWebSupported) return false;

    const permission = await Notification.requestPermission();
    setState(permission === "granted" ? "granted" : permission === "denied" ? "denied" : "default");
    if (permission !== "granted") return false;

    try {
      const registration = await navigator.serviceWorker.register("/service-worker.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY as string),
      });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
      await savePushSubscription({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
      return true;
    } catch (err) {
      console.error("[usePushNotifications] Échec activation:", err);
      return false;
    }
  }, [isWebSupported]);

  /** Désabonne le navigateur courant + prévient le serveur (best-effort, ne bloque jamais). */
  const disable = useCallback(async (): Promise<void> => {
    if (!isWebSupported) return;
    try {
      const registration = await navigator.serviceWorker.getRegistration("/service-worker.js");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await deletePushSubscription(endpoint).catch(() => {});
      }
    } catch (err) {
      console.error("[usePushNotifications] Échec désactivation:", err);
    }
  }, [isWebSupported]);

  return { state, isWebSupported, enable, disable };
}
