import { OrderStatus, RiderStatus } from "@golfeexpress/types";
import { prisma } from "@/lib/prisma";

/**
 * Interrupteurs de sécurisation de la capacité de livraison (voir échange
 * produit du 20/08/2026 sur la gestion "aucun livreur disponible").
 * Stockés comme deux GlobalSetting classiques (booléens) plutôt qu'un
 * nouveau modèle dédié : la clé n'existe tout simplement pas tant que
 * personne n'a touché à Admin > Zones & Capacité, et son absence est
 * volontairement interprétée comme "désactivé" — donc tant que l'admin n'a
 * rien activé, POST /api/orders se comporte EXACTEMENT comme avant
 * l'introduction de ces contrôles.
 */
export const CAPACITY_SETTINGS_KEYS = {
  cityGatingEnabled: "capacity.city_gating_enabled",
  riderCheckEnabled: "capacity.rider_check_enabled",
  stuckOrderAlertEnabled: "capacity.stuck_order_alert_enabled",
  staleRiderAutoOfflineEnabled: "capacity.stale_rider_auto_offline_enabled",
  openingHoursMandatoryEnabled: "capacity.opening_hours_mandatory_enabled",
} as const;

// Délai après lequel une commande PREPARING/READY sans livreur déclenche
// une alerte admin (voir cron/capacity-sweep/route.ts) — correspond au
// "délai + escalade" évoqué dans l'échange produit du 20/08/2026.
export const STUCK_ORDER_ALERT_THRESHOLD_MINUTES = 15;

// Délai d'inactivité (aucune mise à jour de position) au-delà duquel un
// livreur resté "en ligne" par oubli est automatiquement repassé hors
// ligne — évite qu'il compte comme "disponible" dans le garde-fou de
// capacité alors qu'il n'est en réalité plus en train de travailler.
export const STALE_RIDER_OFFLINE_THRESHOLD_MINUTES = 30;

async function readBooleanSetting(key: string): Promise<boolean> {
  const setting = await prisma.globalSetting.findUnique({ where: { key } });
  return setting?.value === true;
}

export async function isCityGatingEnabled(): Promise<boolean> {
  return readBooleanSetting(CAPACITY_SETTINGS_KEYS.cityGatingEnabled);
}

export async function isRiderCheckEnabled(): Promise<boolean> {
  return readBooleanSetting(CAPACITY_SETTINGS_KEYS.riderCheckEnabled);
}

export async function isStuckOrderAlertEnabled(): Promise<boolean> {
  return readBooleanSetting(CAPACITY_SETTINGS_KEYS.stuckOrderAlertEnabled);
}

export async function isStaleRiderAutoOfflineEnabled(): Promise<boolean> {
  return readBooleanSetting(CAPACITY_SETTINGS_KEYS.staleRiderAutoOfflineEnabled);
}

/**
 * Horaires d'ouverture obligatoires (échange produit du 20/08/2026 : "les
 * horaires du pro bloquent tout quand c'est en dehors des horaires
 * d'ouverture, donc cela devient obligatoire que les pros saisissent leurs
 * horaires"). Séparé du contrôle "commerçant fermé" existant : un Pro peut
 * aujourd'hui ne JAMAIS avoir renseigné d'horaires (endpoint dédié, non
 * obligatoire à l'inscription) — computeOpenStatus() traite alors ce cas
 * comme "ouvert" par défaut faute de mieux, ce qui masque le problème
 * plutôt que de le résoudre. Comme les autres garde-fous : désactivé par
 * défaut, à activer une fois que les Pros existants ont eu l'occasion de
 * renseigner leurs horaires (sinon leurs commandes seraient bloquées du
 * jour au lendemain sans prévenir).
 */
export async function isOpeningHoursMandatoryEnabled(): Promise<boolean> {
  return readBooleanSetting(CAPACITY_SETTINGS_KEYS.openingHoursMandatoryEnabled);
}

/**
 * Nombre de livreurs "disponibles" au sens du garde-fou : en ligne, KYC
 * validé (RiderStatus.ACTIVE), et sans commande dans un statut actif. C'est
 * LA source de vérité unique pour ce calcul — utilisée à la fois pour
 * bloquer/autoriser une commande (orders/route.ts) et pour l'indicateur
 * temps réel du Dashboard admin (admin/capacity/route.ts) — jamais deux
 * requêtes séparées qui pourraient un jour diverger.
 */
export async function getAvailableRidersCount(): Promise<number> {
  return prisma.rider.count({
    where: {
      isOnline: true,
      status: RiderStatus.ACTIVE,
      orders: { none: { status: { in: [OrderStatus.RIDER_ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.IN_DELIVERY] } } },
    },
  });
}

export async function getOnlineRidersCount(): Promise<number> {
  return prisma.rider.count({ where: { isOnline: true, status: RiderStatus.ACTIVE } });
}
