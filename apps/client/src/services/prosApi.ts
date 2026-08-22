import { apiFetch } from "@/services/apiClient";
import { getCategoryVisual, haversineDistanceKm, estimateDeliveryMinutes } from "@/services/categoryVisuals";
import type { Pro, Product, OpenStatus, Review, ProductReview } from "@golfeexpress/types";

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

// Repli UNIQUEMENT si GET /api/settings/pricing échoue (panne réseau...) —
// le vrai tarif vient maintenant de cette route (voir fetchDeliveryFeeDisplay
// ci-dessous), plus d'un montant codé en dur qui divergeait silencieusement
// du tarif réellement configuré depuis Admin > Tarification (bug corrigé le
// 21/08/2026 : cette constante restait bloquée sur l'ancien tarif 2,90 €
// même après que le tarif réel soit passé à 3,90 €).
const DEFAULT_DELIVERY_FEE = 3.9;
const DEFAULT_MIN_ORDER = 0;

/**
 * GET /api/settings/pricing (public) — vrai tarif de livraison actuellement
 * configuré depuis Admin > Tarification, celui réellement facturé par
 * POST /api/orders. Appelée une fois par écran de liste plutôt que mise en
 * cache indéfiniment, pour rester à jour si l'Admin change le tarif.
 */
async function fetchDeliveryFeeDisplay(): Promise<number> {
  try {
    const data = await apiFetch<{ deliveryFee: number }>("/api/settings/pricing", { skipAuth: true });
    return typeof data.deliveryFee === "number" ? data.deliveryFee : DEFAULT_DELIVERY_FEE;
  } catch {
    return DEFAULT_DELIVERY_FEE;
  }
}

/**
 * Construit un ProWithUi (forme attendue par les composants existants —
 * ProCard, NearbyItem...) à partir d'un Pro brut renvoyé par l'API, en
 * dérivant les champs visuels depuis la catégorie et la distance réelle
 * depuis les coordonnées de l'utilisateur.
 */
function toProWithUi(
  pro: Pro & { addresses?: { lat: number; lng: number }[] },
  userLat?: number,
  userLng?: number,
  deliveryFee: number = DEFAULT_DELIVERY_FEE
): ProWithUi {
  const visual = getCategoryVisual(pro.category);

  const proAddress = pro.addresses?.[0];
  const distanceKm =
    proAddress && userLat !== undefined && userLng !== undefined
      ? haversineDistanceKm(userLat, userLng, proAddress.lat, proAddress.lng)
      : 1.5; // valeur neutre si on ne connaît pas encore la position de l'utilisateur

  // Relie l'estimation affichée en haut de la fiche au temps de préparation
  // réellement configuré par le commerçant (Pro Settings) plutôt qu'à une
  // marge générique — sinon les deux valeurs divergent silencieusement.
  const { min, max } = estimateDeliveryMinutes(distanceKm, pro.defaultPrepTimeMinutes ?? 10);

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
    deliveryFeeDisplay: deliveryFee,
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
  const [data, deliveryFee] = await Promise.all([
    apiFetch<{ pros: Pro[] }>(`/api/pros${search ? `?${search}` : ""}`, { skipAuth: true }),
    fetchDeliveryFeeDisplay(),
  ]);

  return data.pros.map((pro) => toProWithUi(pro, params.userLat, params.userLng, deliveryFee));
}

/** GET /api/pros/[proId]/products — menu public d'un commerçant. */
export async function fetchProProducts(proId: string): Promise<Product[]> {
  const data = await apiFetch<{ products: Product[] }>(`/api/pros/${proId}/products`, { skipAuth: true });
  return data.products;
}

/** GET /api/pros/[proId]/reviews — avis clients publics d'un commerçant. */
export async function fetchProReviews(proId: string): Promise<Review[]> {
  const data = await apiFetch<{ reviews: Review[] }>(`/api/pros/${proId}/reviews`, { skipAuth: true });
  return data.reviews;
}

/**
 * GET /api/products/[productId]/reviews — avis clients publics sur un
 * produit précis, entièrement indépendants des avis sur le commerçant (voir
 * model ProductReview) : affichés sur la fiche du produit lui-même.
 */
export async function fetchProductReviews(productId: string): Promise<ProductReview[]> {
  const data = await apiFetch<{ reviews: ProductReview[] }>(`/api/products/${productId}/reviews`, { skipAuth: true });
  return data.reviews;
}
