import webpush from "web-push";
import { prisma } from "@/lib/prisma";

/**
 * Configuration Web Push (notifications "nouvelle commande à proximité"
 * pour les livreurs, ajout du 20/09/2026). Contrairement à Expo Push
 * (réservé aux vraies apps natives buildées), l'app Livreur est une PWA
 * consultée depuis livreur.doyougeckoo.fr dans le navigateur -- on utilise
 * donc le standard Web Push (service worker + clés VAPID), qui marche sur
 * Android sans condition, et sur iPhone uniquement si le livreur a fait
 * "Ajouter à l'écran d'accueil" (limitation Apple, pas du code).
 *
 * VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY : paire de clés générée une seule
 * fois pour ce projet (jamais des identifiants d'un service tiers à
 * protéger comme Stripe/Supabase -- juste une paire cryptographique propre
 * à cette fonctionnalité), à coller dans les variables d'environnement
 * Vercel du projet apps/api. La clé publique est aussi nécessaire côté
 * navigateur (apps/livreur) au moment de l'abonnement -- voir
 * EXPO_PUBLIC_VAPID_PUBLIC_KEY dans apps/livreur/.env.local.
 */
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_CONTACT_EMAIL = process.env.VAPID_CONTACT_EMAIL ?? "contact@doyougeckoo.fr";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error("[webPush] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY manquantes -- notifications livreurs désactivées.");
    return false;
  }
  webpush.setVapidDetails(`mailto:${VAPID_CONTACT_EMAIL}`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Chemin ouvert au clic sur la notification (relatif à livreur.doyougeckoo.fr, ou pro.doyougeckoo.fr pour sendPushToPro). */
  url?: string;
}

/**
 * Envoie une notification push à TOUS les abonnements enregistrés d'un
 * livreur (plusieurs si connecté depuis plusieurs appareils/navigateurs).
 * Best-effort volontaire : un envoi qui échoue (abonnement expiré/révoqué,
 * codes 404/410 de la spec Web Push) ne doit jamais faire planter l'appelant
 * -- on nettoie simplement l'abonnement caduc en base et on continue avec
 * les autres. Ne fait JAMAIS partie d'une transaction avec la logique
 * commande : purement un effet de bord secondaire, best-effort par design.
 */
export async function sendPushToRider(riderId: string, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;

  const subscriptions = await prisma.riderPushSubscription.findMany({ where: { riderId } });
  if (subscriptions.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        // 404/410 = abonnement définitivement invalide côté navigateur
        // (désinstallation, permissions révoquées, cache navigateur vidé...)
        // -- on le supprime pour ne plus jamais réessayer dessus. Toute
        // autre erreur (réseau, 5xx temporaire) est juste loguée : elle
        // pourra retenter au prochain envoi naturellement.
        if (statusCode === 404 || statusCode === 410) {
          await prisma.riderPushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error(`[webPush] Échec envoi (livreur ${riderId}, endpoint ${sub.endpoint.slice(0, 40)}...):`, err);
        }
      }
    })
  );
}

/**
 * Équivalent sendPushToRider ci-dessus, pour le Pro (ajout du 22/09/2026,
 * demande de Krys -- être notifié même appli fermée, argument concurrentiel
 * face à des plateformes comme Uber Eats). `proId` correspond à la BOUTIQUE
 * (voir ProPushSubscription, prisma/schema.prisma) : envoie à TOUS les
 * abonnements actifs, patron et employés confondus, chacun ayant pu
 * s'abonner depuis son propre appareil. Même config VAPID que les livreurs
 * -- une seule paire de clés sert l'ensemble de la plateforme, ce n'est pas
 * un identifiant par appli mais par serveur émetteur.
 */
export async function sendPushToPro(proId: string, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;

  const subscriptions = await prisma.proPushSubscription.findMany({ where: { proId } });
  if (subscriptions.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.proPushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error(`[webPush] Échec envoi (pro ${proId}, endpoint ${sub.endpoint.slice(0, 40)}...):`, err);
        }
      }
    })
  );
}
