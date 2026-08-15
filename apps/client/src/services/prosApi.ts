import { apiFetch } from "@/services/apiClient";
import { getCategoryVisual, haversineDistanceKm, estimateDeliveryMinutes } from "@/services/categoryVisuals";
import type { Pro, Product, OpenStatus } from "@golfeexpress/types";

export interface ProWithUi extends Pro {
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
  isOpen: boolean;
  /** Motif détaillé (fermé, en vacances, hors horaires...) — voir OpenStatus. Absent si l'API ne l'a pas renvoyé (repli ouvert). */
  openReason: OpenStatus["reason"];
  closedUntil: string | null;
  closedNote: string | null;
  distanceKm: number;
  estimatedMinMinutes: number;
  estimatedMaxMinutes: number;
  tags: string[];
  minOrder: number;
  deliveryFeeDisplay: number;
  /** Adresse de retrait principale du Pro — nécessaire pour fromAddressId à la commande. */
  pickupAddressId: string | null;
}

// Tant que GlobalSetting n'est pas exposé via une route publique dédiée
// (voir TODO dans apps/api), ces valeurs par défaut reflètent
// min_delivery_fee/max_delivery_fee des paramètres seedés par défaut.
const DEFAULT_DELIVERY_FEE = 2.9;
const DEFAULT_MIN_ORDER = 0;

/**
 * Construit un ProWithUi (forme attendue par les composants existants —
 * ProCard, NearbyItem...) à partir d'un Pro brut renvoyé par l'API, en
 * dérivant les champs visuels depuis la catégorie et la distance réelle
 * depuis les coordonnées de l'utilisateur.
 */
function toProWithUi(pro: Pro & { addresses?: { lat: number; lng: number }[] }, userLat?: number, userLng?: number): ProWithUi {
  const visual = getCategoryVisual(pro.category);

  const proAddress = pro.addresses?.[0];
  const distanceKm =
    proAddress && userLat !== undefined && userLng !== undefined
      ? haversineDistanceKm(userLat, userLng, proAddress.lat, proAddress.lng)
      : 1.5; // valeur neutre si on ne connaît pas encore la position de l'utilisateur

  const { min, max } = estimateDeliveryMinutes(distanceKm);

  // Calculé côté serveur (voir GET /api/pros -> lib/openingHours.ts) pour
  // éviter tout décalage de fuseau horaire côté app — repli "ouvert" si le
  // champ est absent (ex: ancien cache) plutôt que d'afficher "fermé" à tort.
  const openStatus = pro.openStatus;

  return {
    ...pro,
    emoji: visual.emoji,
    gradientFrom: visual.gradientFrom,
    gradientTo: visual.gradientTo,
    isOpen: openStatus ? openStatus.isOpen : true,
    openReason: openStatus?.reason ?? "OPEN",
    closedUntil: openStatus?.manualClosureUntil ?? null,
    closedNote: openStatus?.manualClosureNote ?? null,
    distanceKm,
    estimatedMinMinutes: min,
    estimatedMaxMinutes: max,
    tags: [], // TODO: pas de champ "tags" dans le modèle Pro — à dériver de Product.category si besoin
    minOrder: DEFAULT_MIN_ORDER,
    deliveryFeeDisplay: DEFAULT_DELIVERY_FEE,
    pickupAddressId: pro.pickupAddressId ?? (pro as Pro & { addresses?: { id: string }[] }).addresses?.[0]?.id ?? null,
  };
}

interface FetchProsParams {
  category?: string;
  city?: string;
  userLat?: number;
  userLng?: number;
}

/** GET /api/pros — catalogue public, pas d'auth requise. */
export async function fetchPros(params: FetchProsParams = {}): Promise<ProWithUi[]> {
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.city) query.set("city", params.city);

  const search = query.toString();
  const data = await apiFetch<{ pros: Pro[] }>(`/api/pros${search ? `?${search}` : ""}`, { skipAuth: true });

  return data.pros.map((pro) => toProWithUi(pro, params.userLat, params.userLng));
}

/** GET /api/pros/[proId]/products — menu public d'un commerçant. */
export async function fetchProProducts(proId: string): Promise<Product[]> {
  const data = await apiFetch<{ products: Product[] }>(`/api/pros/${proId}/products`, { skipAuth: true });
  return data.products;
}
