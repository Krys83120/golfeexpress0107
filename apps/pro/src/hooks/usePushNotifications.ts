import { useCallback, useEffect, useState } from "react";
import { savePushSubscription, deletePushSubscription } from "@/services/pushNotificationsApi";

/**
 * Notifications "nouvelle commande à préparer" côté Pro (ajout du
 * 22/09/2026, demande de Krys : être notifié même appli complètement
 * fermée -- "imaginons le pro a Uber et doyougeckoo en même temps... avant
 * de nous choisir car on est local et moins cher").
 *
 * Même mécanisme exact que apps/livreur/src/hooks/usePushNotifications.ts
 * (Web Push standard + clés VAPID), adapté ici pour un projet Vite/React
 * classique plutôt qu'Expo -- apps/pro n'utilise PAS react-native (voir
 * package.json, "build": "tsc --noEmit && vite build"), donc pas de
 * `Platform.OS` à vérifier : c'est TOUJOURS du web ici. Voir webPush.ts
 * côté API pour le détail du choix technique (Web Push plutôt qu'Expo Push).
 *
 * Sur iPhone, Safari n'autorise les notifications web QUE si l'appli a été
 * ajoutée à l'écran d'accueil (limitation Apple, iOS 16.4+) -- ce hook ne
 * peut rien y faire de plus que prévenir l'utilisateur (voir
 * NotificationsPage.tsx pour le message affiché).
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

// Conversion standard clé VAPID (base64url) -> Uint8Array, requise par
// PushManager.subscribe -- identique à apps/livreur, voir ce fichier pour
// la source (snippet largement repris tel quel dans l'écosystème).
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

  const isSupported =
    typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && !!VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!isSupported) {
      setState("unsupported");
      return;
    }
    setState(Notification.permission === "granted" ? "granted" : Notification.permission === "denied" ? "denied" : "default");
  }, [isSupported]);

  /** Demande la permission navigateur + crée/enregistre l'abonnement côté serveur. */
  const enable = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    const permission = await Notification.requestPermission();
    setState(permission === "granted" ? "granted" : permission === "denied" ? "denied" : "default");
    if (permission !== "granted") return false;

    try {
      const registration = await navigator.serviceWorker.register("/service-worker.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast nécessaire -- avec les typings DOM récents (TS 5.9+),
        // Uint8Array est générique (Uint8Array<ArrayBufferLike>) alors que
        // PushSubscriptionOptionsInit.applicationServerKey exige
        // spécifiquement un Uint8Array<ArrayBuffer> : purement une
        // pédanterie de typage (notre Uint8Array est bien adossé à un vrai
        // ArrayBuffer, jamais un SharedArrayBuffer), sans impact à
        // l'exécution. Correctif du 22/09/2026 (a fait échouer le build
        // Vercel : "Type 'Uint8Array<ArrayBufferLike>' is not assignable to
        // type 'string | BufferSource | null | undefined'").
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY as string) as BufferSource,
      });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
      await savePushSubscription({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
      return true;
    } catch (err) {
      console.error("[usePushNotifications] Échec activation:", err);
      return false;
    }
  }, [isSupported]);

  /** Désabonne le navigateur courant + prévient le serveur (best-effort, ne bloque jamais). */
  const disable = useCallback(async (): Promise<void> => {
    if (!isSupported) return;
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
  }, [isSupported]);

  return { state, isSupported, enable, disable };
}
