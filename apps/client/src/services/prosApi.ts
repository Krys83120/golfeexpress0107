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
  /**
   * true UNIQUEMENT quand distanceKm est une vraie distance calculée depuis
   * l'adresse de livraison active (22/08/2026) — false quand on utilise la
   * valeur neutre de repli (1,5 km, pas de vraie adresse connue). Permet à
   * ProCard.tsx d'afficher "Livraison" (montant exact pour cette adresse)
   * plutôt que "Livraison à partir de" (estimation) quand on connaît
   * vraiment la distance — corrige un libellé devenu trompeur une fois le
   * supplément par distance activé : le montant affiché n'est plus une
   * simple valeur plancher, c'est déjà le tarif réel pour cette adresse.
   */
  deliveryFeeIsEstimate: boolean;
  /** Adresse de retrait principale du Pro — nécessaire pour fromAddressId à la commande. */
  pickupAddressId: string | null;
  /**
   * Coordonnées de cette même adresse de retrait (22/08/2026) — permettent
   * de recalculer la distance et donc le vrai tarif de livraison dans le
   * panier (voir CartScreen.tsx) au moment où l'adresse de livraison du
   * client est choisie ou changée, plutôt que d'utiliser un tarif figé au
   * moment de l'ajout au panier.
   */
  pickupLat: number | null;
  pickupLng: number | null;
}

// Repli UNIQUEMENT si GET /api/settings/pricing échoue (panne réseau...) —
// le vrai tarif vient maintenant de cette route (voir fetchPricingConfig
// ci-dessous), plus d'un montant codé en dur qui divergeait silencieusement
// du tarif réellement configuré depuis Admin > Tarification (bug corrigé le
// 21/08/2026 : cette constante restait bloquée sur l'ancien tarif 2,90 €
// même après que le tarif réel soit passé à 3,90 €).
const DEFAULT_DELIVERY_FEE = 3.9;
const DEFAULT_MIN_ORDER = 0;
// Doit rester identique à DEFAULT_FREE_DELIVERY_THRESHOLD côté API
// (apps/api/src/lib/pricingSettings.ts) — valeur de repli uniquement, le
// vrai montant vient de GET /api/settings/pricing.
const DEFAULT_FREE_DELIVERY_THRESHOLD = 50;

export interface DeliveryFeeTier {
  maxDistanceKm: number;
  fee: number;
}

export interface PricingConfig {
  deliveryFee: number;
  deliveryFeeByDistanceEnabled: boolean;
  deliveryFeeTiers: DeliveryFeeTier[];
  /**
   * Livraison gratuite au-dessus d'un panier minimum (22/08/2026) —
   * désactivé par défaut. Voir computeEffectiveDeliveryFee ci-dessous, seule
   * fonction qui doit servir à afficher le tarif définitif dès que le
   * panier (subtotal) est connu — CartScreen.tsx, pas ProCard.tsx (qui
   * n'a pas encore de panier).
   */
  freeDeliveryThresholdEnabled: boolean;
  freeDeliveryThresholdAmount: number;
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  deliveryFee: DEFAULT_DELIVERY_FEE,
  deliveryFeeByDistanceEnabled: false,
  deliveryFeeTiers: [],
  freeDeliveryThresholdEnabled: false,
  freeDeliveryThresholdAmount: DEFAULT_FREE_DELIVERY_THRESHOLD,
};

/**
 * GET /api/settings/pricing (public) — vrai tarif de livraison configuré
 * depuis Admin > Tarification, celui réellement facturé par POST
 * /api/orders : soit un montant fixe unique, soit — si le supplément par
 * distance est activé (22/08/2026) — une grille de paliers. Appelée une
 * fois par écran de liste plutôt que mise en cache indéfiniment, pour
 * rester à jour si l'Admin change le réglage.
 *
 * Exportée (22/08/2026) : réutilisée telle quelle par CartScreen.tsx pour
 * calculer le VRAI tarif de livraison une fois l'adresse du client connue
 * (via la distance réelle jusqu'au commerçant), au lieu d'un montant fixe
 * codé en dur qui divergeait silencieusement du tarif facturé par le
 * serveur — même bug que celui déjà corrigé le 21/08/2026 sur les fiches
 * commerçant, mais qui subsistait dans l'écran panier lui-même.
 */
export async function fetchPricingConfig(): Promise<PricingConfig> {
  try {
    const data = await apiFetch<PricingConfig>("/api/settings/pricing", { skipAuth: true });
    return {
      deliveryFee: typeof data.deliveryFee === "number" ? data.deliveryFee : DEFAULT_DELIVERY_FEE,
      deliveryFeeByDistanceEnabled: !!data.deliveryFeeByDistanceEnabled,
      deliveryFeeTiers: Array.isArray(data.deliveryFeeTiers) ? data.deliveryFeeTiers : [],
      freeDeliveryThresholdEnabled: !!data.freeDeliveryThresholdEnabled,
      freeDeliveryThresholdAmount:
        typeof data.freeDeliveryThresholdAmount === "number"
          ? data.freeDeliveryThresholdAmount
          : DEFAULT_FREE_DELIVERY_THRESHOLD,
    };
  } catch {
    return DEFAULT_PRICING_CONFIG;
  }
}

/**
 * Même logique que computeDeliveryFeeForDistance côté API
 * (apps/api/src/lib/pricingSettings.ts) — volontairement dupliquée ici :
 * pas de package partagé exécutable entre l'API (Next.js) et cette app
 * (Expo/React Native), seulement des types (@golfeexpress/types).
 */
export function computeDeliveryFeeForDistance(distanceKm: number, config: PricingConfig): number {
  if (!config.deliveryFeeByDistanceEnabled || config.deliveryFeeTiers.length === 0) return config.deliveryFee;
  const sorted = [...config.deliveryFeeTiers].sort((a, b) => a.maxDistanceKm - b.maxDistanceKm);
  const match = sorted.find((t) => distanceKm <= t.maxDistanceKm);
  return match ? match.fee : sorted[sorted.length - 1].fee;
}

/**
 * Le plus petit tarif de livraison possible, tous paliers confondus — la
 * vraie valeur plancher à afficher tant qu'on ne connaît PAS encore la
 * distance réelle (pas d'adresse de livraison choisie).
 *
 * Corrige un bug (22/08/2026) : ProCard.tsx utilisait une distance de repli
 * arbitraire (1,5 km) pour calculer le tarif affiché avant que l'adresse
 * soit connue. Avec une grille resserrée (ex: ≤1 km -> 3,90€, ≤3 km ->
 * 5,90€...), cette distance fictive tombait dans un palier plus CHER que ce
 * que payait finalement le client une fois sa vraie adresse (souvent plus
 * proche) prise en compte — "à partir de 5,90€" affiché, puis "3,90€" une
 * fois l'adresse choisie. "À partir de" doit être un plancher garanti (le
 * prix réel ne peut jamais être inférieur à ce qui est annoncé) : on prend
 * donc le tarif du palier le moins cher, pas celui d'une distance inventée.
 */
export function minPossibleDeliveryFee(config: PricingConfig): number {
  if (!config.deliveryFeeByDistanceEnabled || config.deliveryFeeTiers.length === 0) return config.deliveryFee;
  return Math.min(...config.deliveryFeeTiers.map((t) => t.fee));
}

/**
 * Même logique que getEffectiveDeliveryFee côté API
 * (apps/api/src/lib/pricingSettings.ts) — combine le tarif par distance
 * ci-dessus avec le seuil "livraison gratuite au-dessus d'un panier"
 * (22/08/2026, désactivé par défaut) : à utiliser à la place de
 * computeDeliveryFeeForDistance dès que le panier (subtotal) est connu,
 * c-à-d dans CartScreen.tsx — pas dans ProCard.tsx, qui affiche un tarif
 * "à partir de" avant même que l'utilisateur ait un panier.
 */
export function computeEffectiveDeliveryFee(distanceKm: number, subtotal: number, config: PricingConfig): number {
  const baseFee = computeDeliveryFeeForDistance(distanceKm, config);
  if (!config.freeDeliveryThresholdEnabled) return baseFee;
  return subtotal >= config.freeDeliveryThresholdAmount ? 0 : baseFee;
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
  pricingConfig: PricingConfig = DEFAULT_PRICING_CONFIG
): ProWithUi {
  const visual = getCategoryVisual(pro.category);

  const proAddress = pro.addresses?.[0];
  const hasKnownDistance = !!proAddress && userLat !== undefined && userLng !== undefined;
  const distanceKm = hasKnownDistance
    ? haversineDistanceKm(userLat as number, userLng as number, proAddress!.lat, proAddress!.lng)
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
    // Tant que la distance réelle n'est pas connue, on affiche le plancher
    // garanti (palier le moins cher) plutôt que le tarif d'une distance de
    // repli inventée — voir minPossibleDeliveryFee ci-dessus.
    deliveryFeeDisplay: hasKnownDistance
      ? computeDeliveryFeeForDistance(distanceKm, pricingConfig)
      : minPossibleDeliveryFee(pricingConfig),
    deliveryFeeIsEstimate: !hasKnownDistance,
    pickupAddressId: pro.pickupAddressId ?? (pro as Pro & { addresses?: { id: string }[] }).addresses?.[0]?.id ?? null,
    pickupLat: proAddress?.lat ?? null,
    pickupLng: proAddress?.lng ?? null,
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
  const [data, pricingConfig] = await Promise.all([
    apiFetch<{ pros: Pro[] }>(`/api/pros${search ? `?${search}` : ""}`, { skipAuth: true }),
    fetchPricingConfig(),
  ]);

  return data.pros.map((pro) => toProWithUi(pro, params.userLat, params.userLng, pricingConfig));
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
