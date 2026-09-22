import { apiFetch } from "@/services/apiClient";

/**
 * Notifications push "nouvelle commande" côté Pro (ajout du 22/09/2026,
 * demande de Krys) -- même structure exacte que
 * apps/livreur/src/services/ridersApi.ts (savePushSubscription /
 * deletePushSubscription), voir hooks/usePushNotifications.ts pour
 * l'appelant et apps/api/src/app/api/pros/push-subscription/route.ts côté
 * serveur.
 */
export interface PushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** POST /api/pros/push-subscription -- enregistre l'abonnement Web Push du navigateur courant. */
export async function savePushSubscription(subscription: PushSubscriptionPayload): Promise<void> {
  await apiFetch("/api/pros/push-subscription", { method: "POST", body: subscription });
}

/** DELETE /api/pros/push-subscription */
export async function deletePushSubscription(endpoint: string): Promise<void> {
  await apiFetch("/api/pros/push-subscription", { method: "DELETE", body: { endpoint } });
}
