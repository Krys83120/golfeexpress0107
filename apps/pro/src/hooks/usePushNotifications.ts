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

export interface EnablePushResult {
  ok: boolean;
  /** Message d'erreur précis (pour affichage direct à Krys) -- absent si `ok` est true ou si l'échec est juste "permission refusée" (déjà couvert par `state`). */
  error?: string;
}

/**
 * CORRECTIF du 22/09/2026 (signalé par Krys : toggle resté bloqué "activé"
 * sans jamais pouvoir le désactiver, alors qu'aucun abonnement n'était
 * enregistré côté serveur) : `state` ci-dessous reflète UNIQUEMENT la
 * permission navigateur (Notification.permission), qui est un cliquet --
 * une fois "granted", elle le reste pour toujours (impossible à repasser à
 * "default" depuis le JS, seulement depuis les réglages système). Le
 * toggle affiché dans NotificationsPage.tsx doit refléter si un ABONNEMENT
 * est réellement actif MAINTENANT, pas si la permission a un jour été
 * accordée -- d'où `isSubscribed`, vérifié via pushManager.getSubscription()
 * (l'état réel du navigateur) plutôt que déduit de la permission. Sans ça,
 * un premier essai raté (ex: l'enregistrement serveur avait échoué) laissait
 * le toggle affiché "activé" pour toujours, empêchant toute nouvelle
 * tentative.
 */
export function usePushNotifications() {
  const [state, setState] = useState<PushSupportState>("checking");
  const [isSubscribed, setIsSubscribed] = useState(false);

  const isSupported =
    typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && !!VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!isSupported) {
      setState("unsupported");
      return;
    }
    setState(Notification.permission === "granted" ? "granted" : Notification.permission === "denied" ? "denied" : "default");

    // Vérifie s'il existe VRAIMENT un abonnement actif sur cet appareil (ex:
    // au rechargement de la page) -- voir commentaire au-dessus de la
    // fonction : ne jamais se fier à Notification.permission seul pour ça.
    navigator.serviceWorker
      .getRegistration("/service-worker.js")
      .then((registration) => registration?.pushManager.getSubscription() ?? null)
      .then((subscription) => setIsSubscribed(!!subscription))
      .catch(() => setIsSubscribed(false));
  }, [isSupported]);

  /** Demande la permission navigateur + crée/enregistre l'abonnement côté serveur. */
  const enable = useCallback(async (): Promise<EnablePushResult> => {
    if (!isSupported) return { ok: false };

    const permission = await Notification.requestPermission();
    setState(permission === "granted" ? "granted" : permission === "denied" ? "denied" : "default");
    if (permission !== "granted") return { ok: false };

    try {
      await navigator.serviceWorker.register("/service-worker.js");
      // CORRECTIF du 22/09/2026 (erreur observée chez Krys : "Failed to
      // execute 'subscribe' on 'PushManager': Subscription failed - no
      // active Service Worker") : register() se résout dès qu'un
      // enregistrement démarre, PAS une fois le service worker réellement
      // actif -- lors d'une toute première activation sur un appareil (SW
      // encore en train de s'installer), pushManager.subscribe() peut donc
      // être appelé trop tôt et échouer. `navigator.serviceWorker.ready` est
      // le mécanisme standard pour attendre qu'un service worker actif
      // existe réellement avant de s'abonner (se résout immédiatement si
      // c'est déjà le cas, ex: réactivations suivantes -- aucun ralentissement
      // perceptible dans ce cas).
      const registration = await navigator.serviceWorker.ready;
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
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setIsSubscribed(false);
        return { ok: false, error: "Abonnement navigateur incomplet (endpoint/clés manquants)." };
      }
      try {
        await savePushSubscription({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
      } catch (saveErr) {
        // L'abonnement navigateur a bien été créé mais l'enregistrement
        // côté serveur a échoué -- cas exact rencontré par Krys (POST
        // /api/pros/push-subscription en erreur). On désabonne pour ne pas
        // laisser un abonnement fantôme (jamais su du serveur) traîner sur
        // l'appareil, ce qui ferait échouer toute nouvelle tentative future
        // avec "InvalidStateError: subscription already exists".
        await subscription.unsubscribe().catch(() => {});
        setIsSubscribed(false);
        return {
          ok: false,
          error: saveErr instanceof Error ? `Échec d'enregistrement côté serveur : ${saveErr.message}` : "Échec d'enregistrement côté serveur.",
        };
      }
      setIsSubscribed(true);
      return { ok: true };
    } catch (err) {
      console.error("[usePushNotifications] Échec activation:", err);
      setIsSubscribed(false);
      return { ok: false, error: err instanceof Error ? err.message : "Erreur inconnue lors de l'activation." };
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
    } finally {
      // Toujours repasser le toggle à "désactivé" à l'écran, même s'il n'y
      // avait en réalité rien à désabonner (ex: un précédent essai raté
      // n'avait jamais créé de vrai abonnement) -- voir le commentaire sur
      // isSubscribed plus haut.
      setIsSubscribed(false);
    }
  }, [isSupported]);

  return { state, isSupported, isSubscribed, enable, disable };
}
