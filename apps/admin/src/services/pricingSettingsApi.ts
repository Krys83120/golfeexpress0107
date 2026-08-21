import { apiFetch } from "@/services/apiClient";

/**
 * Garde-fou "panier minimum par distance" (voir
 * apps/api/src/lib/pricingSettings.ts) — même pattern que
 * capacitySettingsApi.ts : lecture/écriture directe par clé GlobalSetting
 * plutôt que via la liste générique /api/admin/settings.
 */
export const PRICING_KEYS = {
  minOrderByDistance: "pricing.min_order_by_distance_enabled",
  minOrderTiers: "pricing.min_order_tiers",
  deliveryFee: "pricing.delivery_fee",
  riderPayBase: "pricing.rider_pay_base",
  riderPayPerKm: "pricing.rider_pay_per_km",
  riderPayMinimum: "pricing.rider_pay_minimum",
} as const;

// Doivent rester identiques aux DEFAULT_* côté API
// (apps/api/src/lib/pricingSettings.ts) — valeurs de repli tant qu'aucun
// admin n'a encore enregistré ses propres montants.
export const DEFAULT_DELIVERY_FEE = 3.9;
export const DEFAULT_RIDER_PAY_BASE = 2.5;
export const DEFAULT_RIDER_PAY_PER_KM = 0.95;
export const DEFAULT_RIDER_PAY_MINIMUM = 5;

export interface MinOrderTier {
  maxDistanceKm: number;
  minOrderAmount: number;
}

// Doit rester identique à DEFAULT_MIN_ORDER_TIERS côté API
// (apps/api/src/lib/pricingSettings.ts) — valeur de repli tant qu'aucune
// grille n'a encore été enregistrée par un admin.
export const DEFAULT_MIN_ORDER_TIERS: MinOrderTier[] = [
  { maxDistanceKm: 3, minOrderAmount: 10 },
  { maxDistanceKm: 6, minOrderAmount: 20 },
  { maxDistanceKm: 10, minOrderAmount: 40 },
  { maxDistanceKm: 15, minOrderAmount: 60 },
];

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

export async function fetchMinOrderByDistanceEnabled(): Promise<boolean> {
  return fetchFlag(PRICING_KEYS.minOrderByDistance);
}

export async function setMinOrderByDistanceEnabled(enabled: boolean): Promise<void> {
  await setFlag(
    PRICING_KEYS.minOrderByDistance,
    enabled,
    "Refuse une commande si le panier est sous le minimum requis pour la distance de livraison (voir grille dédiée)."
  );
}

export async function fetchMinOrderTiers(): Promise<MinOrderTier[]> {
  const data = await apiFetch<{ setting: RawSetting | null }>(`/api/admin/settings/${PRICING_KEYS.minOrderTiers}`);
  const value = data.setting?.value as { tiers?: MinOrderTier[] } | null;
  if (!value?.tiers || !Array.isArray(value.tiers) || value.tiers.length === 0) {
    return DEFAULT_MIN_ORDER_TIERS;
  }
  return value.tiers;
}

export async function saveMinOrderTiers(tiers: MinOrderTier[]): Promise<void> {
  await apiFetch(`/api/admin/settings/${PRICING_KEYS.minOrderTiers}`, {
    method: "PUT",
    body: {
      value: { tiers },
      description: "Grille de panier minimum par distance (Admin > Tarification).",
    },
  });
}

/** GET /api/admin/settings/:key — absent = valeur de repli fournie par l'appelant. */
async function fetchNumber(key: string, fallback: number): Promise<number> {
  const data = await apiFetch<{ setting: RawSetting | null }>(`/api/admin/settings/${key}`);
  const value = data.setting?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

async function setNumber(key: string, value: number, description: string): Promise<void> {
  await apiFetch(`/api/admin/settings/${key}`, {
    method: "PUT",
    body: { value, description },
  });
}

/**
 * Frais de livraison facturés au client (échange produit du 21/08/2026 :
 * 3,90 € par défaut, contre 2,90 € auparavant — finance en partie la hausse
 * de rémunération livreur ci-dessous). Pas de toggle : c'est directement le
 * tarif utilisé par POST /api/orders, modifiable ici sans redéploiement.
 */
export async function fetchDeliveryFee(): Promise<number> {
  return fetchNumber(PRICING_KEYS.deliveryFee, DEFAULT_DELIVERY_FEE);
}

export async function setDeliveryFee(value: number): Promise<void> {
  await setNumber(
    PRICING_KEYS.deliveryFee,
    value,
    "Frais de livraison facturés au client, appliqués à toute nouvelle commande."
  );
}

/**
 * Rémunération livreur = base + (par km × distance), jamais sous le
 * minimum garanti (échange produit du 21/08/2026, révisé le même jour :
 * un montant fixe unique finissait par moins bien payer qu'Uber Eats
 * au-delà de ~6 km — voir l'étude de rentabilité échangée). Réglages par
 * défaut choisis pour rester au-dessus du net Uber à toutes les distances
 * utiles du Golfe de Saint-Tropez.
 */
export interface RiderPayRates {
  base: number;
  perKm: number;
  minimum: number;
}

export async function fetchRiderPayRates(): Promise<RiderPayRates> {
  const [base, perKm, minimum] = await Promise.all([
    fetchNumber(PRICING_KEYS.riderPayBase, DEFAULT_RIDER_PAY_BASE),
    fetchNumber(PRICING_KEYS.riderPayPerKm, DEFAULT_RIDER_PAY_PER_KM),
    fetchNumber(PRICING_KEYS.riderPayMinimum, DEFAULT_RIDER_PAY_MINIMUM),
  ]);
  return { base, perKm, minimum };
}

export async function saveRiderPayRates(rates: RiderPayRates): Promise<void> {
  await Promise.all([
    setNumber(PRICING_KEYS.riderPayBase, rates.base, "Base de la rémunération livreur, avant le kilométrage."),
    setNumber(PRICING_KEYS.riderPayPerKm, rates.perKm, "Montant par km ajouté à la base pour la rémunération livreur."),
    setNumber(
      PRICING_KEYS.riderPayMinimum,
      rates.minimum,
      "Rémunération livreur minimum garantie, même si base + kilométrage tombe en dessous."
    ),
  ]);
}
