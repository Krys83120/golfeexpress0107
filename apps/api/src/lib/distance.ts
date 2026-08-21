const EARTH_RADIUS_KM = 6371;

/**
 * Distance à vol d'oiseau (formule de Haversine) entre deux points
 * lat/lng, en kilomètres. Suffisant pour les garde-fous de tarification
 * (panier minimum par distance, voir pricingSettings.ts) — pas besoin d'un
 * calcul d'itinéraire réel (routing) pour ce cas d'usage, l'écart avec la
 * distance routière réelle reste raisonnable sur le Golfe de Saint-Tropez.
 */
export function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}
