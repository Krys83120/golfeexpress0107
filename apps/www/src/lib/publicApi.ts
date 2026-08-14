const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export interface PublicAddress {
  city: string;
  lat: number;
  lng: number;
}

export interface PublicOpeningHour {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface PublicPro {
  id: string;
  businessName: string;
  description?: string | null;
  category: string;
  logo?: string | null;
  coverImage?: string | null;
  status: string;
  rating?: number | null;
  ratingCount: number;
  googleRating?: number | null;
  googleRatingCount?: number | null;
  addresses?: PublicAddress[];
  openingHours?: PublicOpeningHour[];
}

export interface PublicOptionChoice {
  id: string;
  name: string;
  priceModifier: number;
}

export interface PublicProductOption {
  id: string;
  name: string;
  isRequired: boolean;
  isMultiple: boolean;
  choices: PublicOptionChoice[];
}

export interface PublicProduct {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
  category: string;
  isAvailable: boolean;
  isFeatured: boolean;
  options?: PublicProductOption[];
}

export async function fetchPublicPros(): Promise<PublicPro[]> {
  const res = await fetch(`${API_URL}/api/pros`, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.pros ?? []).filter((p: PublicPro) => p.status === "ACTIVE");
}

export async function fetchPublicPro(proId: string): Promise<PublicPro | null> {
  const pros = await fetchPublicPros();
  return pros.find((p) => p.id === proId) ?? null;
}

/** Résout un slug SEO (voir buildProSlug) vers le Pro correspondant. */
export async function fetchPublicProBySlug(slug: string): Promise<PublicPro | null> {
  const pros = await fetchPublicPros();
  const id = resolveProIdFromSlug(slug, pros);
  return id ? pros.find((p) => p.id === id) ?? null : null;
}

export async function fetchPublicProProducts(proId: string): Promise<PublicProduct[]> {
  const res = await fetch(`${API_URL}/api/pros/${proId}/products`, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.products ?? [];
}

/** Distance à vol d'oiseau en km (formule haversine) — suffisante pour trier/afficher une estimation. */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const CATEGORY_LABELS: Record<string, string> = {
  RESTAURANT: "🍽️ Restaurant",
  BOULANGERIE: "🥖 Boulangerie",
  BOUCHERIE: "🥩 Boucherie",
  EPICERIE: "🛒 Épicerie",
  PHARMACIE: "💊 Pharmacie",
  FLEURISTE: "💐 Fleuriste",
  LIBRAIRIE: "📚 Librairie",
  PARFUMERIE: "🧴 Parfumerie",
  AUTRE: "📦 Autre",
};

/** Version sans emoji, pour les slugs d'URL et les <title>/meta SEO. */
export const CATEGORY_LABELS_PLAIN: Record<string, string> = {
  RESTAURANT: "Restaurant",
  BOULANGERIE: "Boulangerie",
  BOUCHERIE: "Boucherie",
  EPICERIE: "Épicerie",
  PHARMACIE: "Pharmacie",
  FLEURISTE: "Fleuriste",
  LIBRAIRIE: "Librairie",
  PARFUMERIE: "Parfumerie",
  AUTRE: "Commerce",
};

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire les accents (é, à, ç...)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Construit une URL /commercants/... lisible et optimisée SEO :
 * ville-categorie-nom-du-commerce-a1b2c3d4 (les 8 premiers caractères de
 * l'id garantissent l'unicité même si deux commerces partagent exactement
 * ville+catégorie+nom — voir resolveProIdFromSlug ci-dessous pour la
 * résolution inverse).
 */
export function buildProSlug(pro: Pick<PublicPro, "id" | "businessName" | "category" | "addresses">): string {
  const city = pro.addresses?.[0]?.city ?? "";
  const category = CATEGORY_LABELS_PLAIN[pro.category] ?? pro.category;
  const parts = [city, category, pro.businessName].filter(Boolean).map(slugify).filter(Boolean);
  return `${parts.join("-")}-${pro.id.slice(0, 8)}`;
}

/**
 * Récupère l'id complet du Pro à partir d'un slug d'URL — on ne se fie
 * qu'au suffixe (8 premiers caractères de l'id), jamais au texte
 * ville/catégorie/nom qui précède : ça permet de renommer un commerce ou
 * de corriger sa ville plus tard sans jamais casser les liens déjà
 * partagés/indexés par Google.
 */
export function resolveProIdFromSlug(slug: string, pros: PublicPro[]): string | null {
  const suffix = slug.split("-").pop();
  if (!suffix || suffix.length < 6) return null;
  return pros.find((p) => p.id.startsWith(suffix))?.id ?? null;
}
