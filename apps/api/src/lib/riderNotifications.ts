import { RiderStatus } from "@golfeexpress/types";
import { prisma } from "@/lib/prisma";
import { haversineDistanceKm } from "@/lib/distance";
import { sendPushToRider } from "@/lib/webPush";

/**
 * Rayon (en km, à vol d'oiseau -- voir distance.ts) autour du point de
 * retrait au-delà duquel un livreur n'est PAS notifié pour une commande
 * donnée. Réglable depuis Admin (voir la clé ci-dessous), même mécanisme
 * générique que branding.og_text_style / seo.public_launch -- un simple
 * GlobalSetting, pas de nouvelle table.
 *
 * Volontairement PAS un garde-fou bloquant comme capacitySettings.ts : ça
 * ne change jamais qui PEUT voir/accepter une commande (la liste "commandes
 * disponibles" reste inchangée, sans filtre de distance -- voir
 * riders/me/available-orders/route.ts), uniquement qui reçoit un "bip" sur
 * son téléphone. Un livreur plus loin que le rayon peut toujours ouvrir
 * l'app et accepter la commande s'il la voit dans la liste.
 */
const RIDER_NOTIFICATION_RADIUS_SETTING_KEY = "riders.notification_radius_km";
export const DEFAULT_RIDER_NOTIFICATION_RADIUS_KM = 5;

/**
 * Au-delà de cet âge, la dernière position connue d'un livreur est
 * considérée trop ancienne pour calculer une distance fiable -- ce livreur
 * n'est simplement pas notifié pour cette commande (il reste visible dans
 * la liste "commandes disponibles" comme n'importe quel livreur en ligne,
 * seule la notification push est sautée). Évite de notifier à tort un
 * livreur dont le téléphone a arrêté d'envoyer sa position (app en arrière-
 * plan, GPS coupé...) alors qu'il pourrait en réalité être loin.
 */
const MAX_LOCATION_AGE_MINUTES = 10;

/**
 * Lecture seule ici -- l'écriture de ce réglage passe par la route générique
 * existante PUT /api/admin/settings/:key (voir Admin >
 * apps/admin/src/services/capacitySettingsApi.ts, setRiderNotificationRadiusKm),
 * le même mécanisme déjà utilisé par les 5 interrupteurs de
 * capacitySettings.ts -- pas de second chemin d'écriture direct ici pour ne
 * pas dupliquer la logique (ex: `updatedBy`) que cette route gère déjà.
 */
export async function getRiderNotificationRadiusKm(): Promise<number> {
  const setting = await prisma.globalSetting.findUnique({ where: { key: RIDER_NOTIFICATION_RADIUS_SETTING_KEY } });
  const value = setting?.value;
  return typeof value === "number" && value > 0 ? value : DEFAULT_RIDER_NOTIFICATION_RADIUS_KM;
}

interface NotifiableOrder {
  id: string;
  orderNumber: string;
  fromAddress: { lat: unknown; lng: unknown };
}

/**
 * Notifie les livreurs à proximité qu'une commande vient de devenir
 * disponible. Pure lecture côté commande (ne touche jamais à Order.status
 * ni à aucun champ métier, hormis marquer riderNotifiedAt en tout dernier,
 * une fois les envois déclenchés) -- voir le commentaire sur ce champ dans
 * schema.prisma. Best-effort : un échec d'envoi individuel (voir
 * sendPushToRider) ne remonte jamais d'erreur ici, cette fonction ne doit
 * JAMAIS faire échouer l'appelant (GET /api/riders/me/available-orders).
 */
export async function notifyNearbyRidersForOrder(order: NotifiableOrder): Promise<void> {
  const fromLat = Number(order.fromAddress.lat);
  const fromLng = Number(order.fromAddress.lng);
  if (!Number.isFinite(fromLat) || !Number.isFinite(fromLng)) return;

  const [radiusKm, candidates] = await Promise.all([
    getRiderNotificationRadiusKm(),
    prisma.rider.findMany({
      where: {
        isOnline: true,
        status: RiderStatus.ACTIVE,
        notificationsEnabled: true,
        currentLat: { not: null },
        currentLng: { not: null },
        pushSubscriptions: { some: {} },
      },
      select: { id: true, currentLat: true, currentLng: true, currentLocationUpdatedAt: true },
    }),
  ]);

  const now = Date.now();
  const nearbyRiderIds = candidates
    .filter((rider) => {
      if (!rider.currentLocationUpdatedAt) return false;
      const ageMinutes = (now - rider.currentLocationUpdatedAt.getTime()) / 60_000;
      if (ageMinutes > MAX_LOCATION_AGE_MINUTES) return false;
      const distanceKm = haversineDistanceKm(Number(rider.currentLat), Number(rider.currentLng), fromLat, fromLng);
      return distanceKm <= radiusKm;
    })
    .map((rider) => rider.id);

  if (nearbyRiderIds.length === 0) {
    // Marqué notifiée quand même : évite de rescanner cette commande à
    // chaque poll tant qu'aucun livreur ne rentre dans le rayon -- si un
    // livreur se rapproche ensuite, il verra malgré tout la commande dans
    // la liste "disponibles" (non filtrée par distance), juste sans le bip.
    await prisma.order.update({ where: { id: order.id }, data: { riderNotifiedAt: new Date() } }).catch(() => {});
    return;
  }

  await Promise.all(
    nearbyRiderIds.map((riderId) =>
      sendPushToRider(riderId, {
        title: "Nouvelle commande à proximité 🛵",
        body: `Commande ${order.orderNumber} disponible près de vous.`,
        url: "/",
      })
    )
  );

  await prisma.order.update({ where: { id: order.id }, data: { riderNotifiedAt: new Date() } }).catch((err) => {
    console.error(`[riderNotifications] Échec marquage riderNotifiedAt (commande ${order.id}):`, err);
  });
}

interface NotifiableParcelOrder {
  id: string;
  parcelNumber: string;
  fromAddress: { lat: unknown; lng: unknown };
}

/**
 * Équivalent notifyNearbyRidersForOrder ci-dessus, pour Colis Express
 * (finition du workflow Livreur, 23/09/2026). Même mécanisme exact --
 * rayon configurable, verrou anti-doublon via ParcelOrder.riderNotifiedAt,
 * best-effort -- appelée depuis GET /api/riders/me/available-parcel-orders
 * à chaque poll, comme notifyNearbyRidersForOrder l'est depuis
 * available-orders.
 */
export async function notifyNearbyRidersForParcelOrder(parcelOrder: NotifiableParcelOrder): Promise<void> {
  const fromLat = Number(parcelOrder.fromAddress.lat);
  const fromLng = Number(parcelOrder.fromAddress.lng);
  if (!Number.isFinite(fromLat) || !Number.isFinite(fromLng)) return;

  const [radiusKm, candidates] = await Promise.all([
    getRiderNotificationRadiusKm(),
    prisma.rider.findMany({
      where: {
        isOnline: true,
        status: RiderStatus.ACTIVE,
        notificationsEnabled: true,
        currentLat: { not: null },
        currentLng: { not: null },
        pushSubscriptions: { some: {} },
      },
      select: { id: true, currentLat: true, currentLng: true, currentLocationUpdatedAt: true },
    }),
  ]);

  const now = Date.now();
  const nearbyRiderIds = candidates
    .filter((rider) => {
      if (!rider.currentLocationUpdatedAt) return false;
      const ageMinutes = (now - rider.currentLocationUpdatedAt.getTime()) / 60_000;
      if (ageMinutes > MAX_LOCATION_AGE_MINUTES) return false;
      const distanceKm = haversineDistanceKm(Number(rider.currentLat), Number(rider.currentLng), fromLat, fromLng);
      return distanceKm <= radiusKm;
    })
    .map((rider) => rider.id);

  if (nearbyRiderIds.length === 0) {
    await prisma.parcelOrder.update({ where: { id: parcelOrder.id }, data: { riderNotifiedAt: new Date() } }).catch(() => {});
    return;
  }

  await Promise.all(
    nearbyRiderIds.map((riderId) =>
      sendPushToRider(riderId, {
        title: "Colis Express à proximité 📦",
        body: `Une course Colis Express (${parcelOrder.parcelNumber}) est disponible près de vous.`,
        url: "/",
      })
    )
  );

  await prisma.parcelOrder.update({ where: { id: parcelOrder.id }, data: { riderNotifiedAt: new Date() } }).catch((err) => {
    console.error(`[riderNotifications] Échec marquage riderNotifiedAt (colis ${parcelOrder.id}):`, err);
  });
}

/**
 * Notifie tous les livreurs en ligne du secteur qu'une commande vient
 * d'entrer en préparation chez ce Pro -- un premier "bip" générique (demande
 * produit du 23/09/2026), distinct de notifyNearbyRidersForOrder ci-dessus
 * qui, lui, se déclenche plus tard, quand la commande devient réellement une
 * candidate dans la liste "disponibles" (voir riderSearchWindow.ts).
 * Volontairement SANS numéro de commande ni adresse : l'idée est juste de
 * prévenir les livreurs du secteur qu'une commande approche, pas de leur
 * indiquer où aller la chercher avant qu'elle soit effectivement
 * disponible -- ça reste entièrement cohérent avec le principe déjà en
 * place ci-dessus (le rayon ne change jamais QUI peut voir/accepter une
 * commande, seulement qui reçoit un "bip").
 *
 * Appelée une seule fois, directement depuis la transition de statut
 * PREPARING (orders/[orderId]/status/route.ts) -- PAS depuis une route
 * pollée comme available-orders -- donc pas besoin d'un verrou anti-doublon
 * façon riderNotifiedAt : cette fonction n'est déclenchée qu'une seule fois
 * par commande, au moment précis où le Pro démarre la préparation.
 */
export async function notifyNearbyRidersOrderPreparing(fromAddress: { lat: unknown; lng: unknown }): Promise<void> {
  const fromLat = Number(fromAddress.lat);
  const fromLng = Number(fromAddress.lng);
  if (!Number.isFinite(fromLat) || !Number.isFinite(fromLng)) return;

  const [radiusKm, candidates] = await Promise.all([
    getRiderNotificationRadiusKm(),
    prisma.rider.findMany({
      where: {
        isOnline: true,
        status: RiderStatus.ACTIVE,
        notificationsEnabled: true,
        currentLat: { not: null },
        currentLng: { not: null },
        pushSubscriptions: { some: {} },
      },
      select: { id: true, currentLat: true, currentLng: true, currentLocationUpdatedAt: true },
    }),
  ]);

  const now = Date.now();
  const nearbyRiderIds = candidates
    .filter((rider) => {
      if (!rider.currentLocationUpdatedAt) return false;
      const ageMinutes = (now - rider.currentLocationUpdatedAt.getTime()) / 60_000;
      if (ageMinutes > MAX_LOCATION_AGE_MINUTES) return false;
      const distanceKm = haversineDistanceKm(Number(rider.currentLat), Number(rider.currentLng), fromLat, fromLng);
      return distanceKm <= radiusKm;
    })
    .map((rider) => rider.id);

  if (nearbyRiderIds.length === 0) return;

  await Promise.all(
    nearbyRiderIds.map((riderId) =>
      sendPushToRider(riderId, {
        title: "Une commande se prépare 👀",
        body: "Une commande est en préparation dans votre secteur — elle sera bientôt disponible.",
        url: "/",
      })
    )
  );
}
