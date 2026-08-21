import { apiFetch } from "@/services/apiClient";

/**
 * Les deux interrupteurs de sécurisation de la capacité de livraison (voir
 * apps/api/src/lib/capacitySettings.ts) — simples GlobalSetting booléens,
 * lus/écrits directement par clé plutôt que via la liste générique
 * /api/admin/settings, pour une page dédiée plus simple à utiliser qu'un
 * éditeur clé/valeur brut.
 */
export const CAPACITY_KEYS = {
  cityGating: "capacity.city_gating_enabled",
  riderCheck: "capacity.rider_check_enabled",
  stuckOrderAlert: "capacity.stuck_order_alert_enabled",
  staleRiderAutoOffline: "capacity.stale_rider_auto_offline_enabled",
  openingHoursMandatory: "capacity.opening_hours_mandatory_enabled",
} as const;

interface RawSetting {
  value: unknown;
}

/** GET /api/admin/settings/:key — absent (jamais créé) = considéré comme désactivé. */
async function fetchFlag(key: string): Promise<boolean> {
  const data = await apiFetch<{ setting: RawSetting | null }>(`/api/admin/settings/${key}`);
  return data.setting?.value === true;
}

/** PUT /api/admin/settings/:key */
async function setFlag(key: string, value: boolean, description: string): Promise<void> {
  await apiFetch(`/api/admin/settings/${key}`, {
    method: "PUT",
    body: { value, description },
  });
}

export async function fetchCapacityFlags(): Promise<{
  cityGatingEnabled: boolean;
  riderCheckEnabled: boolean;
  stuckOrderAlertEnabled: boolean;
  staleRiderAutoOfflineEnabled: boolean;
  openingHoursMandatoryEnabled: boolean;
}> {
  const [
    cityGatingEnabled,
    riderCheckEnabled,
    stuckOrderAlertEnabled,
    staleRiderAutoOfflineEnabled,
    openingHoursMandatoryEnabled,
  ] = await Promise.all([
    fetchFlag(CAPACITY_KEYS.cityGating),
    fetchFlag(CAPACITY_KEYS.riderCheck),
    fetchFlag(CAPACITY_KEYS.stuckOrderAlert),
    fetchFlag(CAPACITY_KEYS.staleRiderAutoOffline),
    fetchFlag(CAPACITY_KEYS.openingHoursMandatory),
  ]);
  return {
    cityGatingEnabled,
    riderCheckEnabled,
    stuckOrderAlertEnabled,
    staleRiderAutoOfflineEnabled,
    openingHoursMandatoryEnabled,
  };
}

export async function setCityGatingEnabled(enabled: boolean): Promise<void> {
  await setFlag(
    CAPACITY_KEYS.cityGating,
    enabled,
    "N'accepte les commandes que dans les villes marquées actives (Admin > Zones & Capacité)."
  );
}

export async function setRiderCheckEnabled(enabled: boolean): Promise<void> {
  await setFlag(
    CAPACITY_KEYS.riderCheck,
    enabled,
    "Refuse une nouvelle commande si aucun livreur n'est disponible (en ligne, sans course active)."
  );
}

export async function setStuckOrderAlertEnabled(enabled: boolean): Promise<void> {
  await setFlag(
    CAPACITY_KEYS.stuckOrderAlert,
    enabled,
    "Envoie une alerte email admin quand une commande reste plus de 15 min sans livreur (voir cron capacity-sweep)."
  );
}

export async function setStaleRiderAutoOfflineEnabled(enabled: boolean): Promise<void> {
  await setFlag(
    CAPACITY_KEYS.staleRiderAutoOffline,
    enabled,
    "Repasse automatiquement hors ligne un livreur resté 'en ligne' sans activité depuis plus de 30 min (voir cron capacity-sweep)."
  );
}

export async function setOpeningHoursMandatoryEnabled(enabled: boolean): Promise<void> {
  await setFlag(
    CAPACITY_KEYS.openingHoursMandatory,
    enabled,
    "Bloque la création de commande chez un Pro qui n'a jamais renseigné ses horaires d'ouverture."
  );
}

export interface CapacitySnapshot {
  onlineRidersCount: number;
  availableRidersCount: number;
}

/** GET /api/admin/capacity — photo instantanée pour l'indicateur temps réel du Dashboard. */
export async function fetchCapacitySnapshot(): Promise<CapacitySnapshot> {
  return apiFetch<CapacitySnapshot>("/api/admin/capacity");
}
