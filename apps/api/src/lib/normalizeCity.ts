/**
 * Normalise un nom de ville pour comparaison (minuscules, accents retirés,
 * espaces superflus écrasés) — évite qu'une commande soit refusée juste
 * parce que "Sainte-Maxime" (ServiceCity, saisi côté admin) et "sainte
 * maxime" ou "Ste Maxime" (Address.city, saisi côté client à l'adresse)
 * n'ont pas exactement la même casse/accentuation. Address.city reste un
 * champ libre (pas de liste fermée), donc cette normalisation est la seule
 * chose qui rapproche les deux côtés de façon fiable.
 */
export function normalizeCity(city: string): string {
  return city
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents (é, à, ç...)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
