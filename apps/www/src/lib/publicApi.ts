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
