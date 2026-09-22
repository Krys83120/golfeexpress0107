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

export interface TestPushResult {
  /** Nombre d'abonnements enregistrés côté serveur pour cette boutique -- 0 veut dire que l'activation n'a jamais atteint le serveur. */
  subscriptionCount: number;
  /** Config VAPID absente côté serveur (ne devrait normalement jamais arriver, voir webPush.ts) -- garde-fou. */
  vapidConfigured: boolean;
}

/**
 * PATCH /api/pros/push-subscription -- déclenche l'envoi d'une notification
 * de test aux abonnements actifs de la boutique (bouton "Tester" de
 * NotificationsPage.tsx, ajouté le 22/09/2026 suite au signalement de Krys :
 * toggle activé mais rien reçu appli fermée). Sert à diagnostiquer où ça
 * bloque sans avoir à passer une vraie commande.
 */
export async function sendTestPush(): Promise<TestPushResult> {
  return apiFetch<TestPushResult>("/api/pros/push-subscription", { method: "PATCH" });
}
