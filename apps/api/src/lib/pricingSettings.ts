import { prisma } from "@/lib/prisma";

/**
 * Garde-fou "panier minimum par distance" (échange produit du 20/08/2026 —
 * décision : ne pas rendre les frais de livraison/la part livreur variables
 * selon la distance pour l'instant, seulement bloquer les commandes
 * structurellement déficitaires : petit panier + longue distance). Même
 * esprit "désactivé par défaut" que capacitySettings.ts.
 */
export const PRICING_SETTINGS_KEYS = {
  minOrderByDistanceEnabled: "pricing.min_order_by_distance_enabled",
  minOrderTiers: "pricing.min_order_tiers",
  deliveryFee: "pricing.delivery_fee",
  riderPayBase: "pricing.rider_pay_base",
  riderPayPerKm: "pricing.rider_pay_per_km",
  riderPayMinimum: "pricing.rider_pay_minimum",
} as const;

// Échange produit du 21/08/2026, révisé le 21/08/2026 : la rémunération
// livreur n'est plus un montant fixe par course (7 €, qui finissait par
// payer MOINS bien qu'Uber Eats au-delà de ~6 km — voir l'étude de
// rentabilité échangée) mais une formule base + par km, plafonnée par un
// minimum garanti, calquée sur la logique d'Uber (2 € + 0,85 €/km + 1 €,
// moins 5 % de frais Uber) mais réglée pour rester AU-DESSUS du net Uber à
// toutes les distances utiles (voir haversineDistanceKm). Les frais de
// livraison facturés au client restent fixes à 3,90 €.
export const DEFAULT_DELIVERY_FEE = 3.9;
export const DEFAULT_RIDER_PAY_BASE = 2.5;
export const DEFAULT_RIDER_PAY_PER_KM = 0.95;
export const DEFAULT_RIDER_PAY_MINIMUM = 5;

async function readNumberSetting(key: string, fallback: number): Promise<number> {
  const setting = await prisma.globalSetting.findUnique({ where: { key } });
  const value = setting?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export async function getDeliveryFee(): Promise<number> {
  return readNumberSetting(PRICING_SETTINGS_KEYS.deliveryFee, DEFAULT_DELIVERY_FEE);
}

/**
 * Rémunération livreur pour une distance donnée : base + (par km × distance),
 * jamais en dessous du minimum garanti — protège les très courtes courses
 * (où base + par km tomberait trop bas) tout en laissant la rémunération
 * augmenter correctement sur les longues courses, contrairement à l'ancien
 * montant fixe.
 */
export async function getRiderPayForDistance(distanceKm: number): Promise<number> {
  const [base, perKm, minimum] = await Promise.all([
    readNumberSetting(PRICING_SETTINGS_KEYS.riderPayBase, DEFAULT_RIDER_PAY_BASE),
    readNumberSetting(PRICING_SETTINGS_KEYS.riderPayPerKm, DEFAULT_RIDER_PAY_PER_KM),
    readNumberSetting(PRICING_SETTINGS_KEYS.riderPayMinimum, DEFAULT_RIDER_PAY_MINIMUM),
  ]);
  return Math.max(minimum, base + perKm * distanceKm);
}

export interface MinOrderTier {
  maxDistanceKm: number;
  minOrderAmount: number;
}

// Valeur de repli tant qu'aucun admin n'a enregistré sa propre grille depuis
// Admin > Tarification — même pattern que DEFAULT_PACKS (partnerPacks.ts) :
// jamais écrite en base tant que non modifiée explicitement.
export const DEFAULT_MIN_ORDER_TIERS: MinOrderTier[] = [
  { maxDistanceKm: 3, minOrderAmount: 10 },
  { maxDistanceKm: 6, minOrderAmount: 20 },
  { maxDistanceKm: 10, minOrderAmount: 40 },
  { maxDistanceKm: 15, minOrderAmount: 60 },
];

export async function isMinOrderByDistanceEnabled(): Promise<boolean> {
  const setting = await prisma.globalSetting.findUnique({
    where: { key: PRICING_SETTINGS_KEYS.minOrderByDistanceEnabled },
  });
  return setting?.value === true;
}

export async function getMinOrderTiers(): Promise<MinOrderTier[]> {
  const setting = await prisma.globalSetting.findUnique({ where: { key: PRICING_SETTINGS_KEYS.minOrderTiers } });
  const value = setting?.value as { tiers?: MinOrderTier[] } | null;
  if (!value?.tiers || !Array.isArray(value.tiers) || value.tiers.length === 0) {
    return DEFAULT_MIN_ORDER_TIERS;
  }
  return [...value.tiers].sort((a, b) => a.maxDistanceKm - b.maxDistanceKm);
}

/**
 * Panier minimum requis pour une distance donnée : premier palier dont
 * maxDistanceKm couvre le trajet ; au-delà du dernier palier configuré, son
 * montant sert de plancher plutôt que de ne plus rien exiger.
 */
export function computeRequiredMinOrder(distanceKm: number, tiers: MinOrderTier[]): number {
  if (tiers.length === 0) return 0;
  const match = tiers.find((t) => distanceKm <= t.maxDistanceKm);
  return match ? match.minOrderAmount : tiers[tiers.length - 1].minOrderAmount;
}
