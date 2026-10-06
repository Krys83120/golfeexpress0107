/**
 * Contenu du QR code de remise imprimé sur le ticket du Pro (06/10/2026) :
 * "DYGPICKUP|<id de la commande>|<code à 6 chiffres>". Ce format doit rester
 * identique à celui produit par apps/pro/src/services/pickupQr.ts.
 */
export const PICKUP_QR_PREFIX = "DYGPICKUP";

export interface ParsedPickupQr {
  orderId: string;
  code: string;
}

/** Retourne null si le texte scanné n'est pas un QR de remise Do You Geckoo. */
export function parsePickupQr(text: string): ParsedPickupQr | null {
  const parts = text.trim().split("|");
  if (parts.length !== 3 || parts[0] !== PICKUP_QR_PREFIX) return null;
  const [, orderId, code] = parts;
  if (!orderId || !/^\d{6}$/.test(code)) return null;
  return { orderId, code };
}

/** Garde uniquement les chiffres d'une saisie manuelle ("483 920" -> "483920"). */
export function normalizeManualCode(input: string): string {
  return input.replace(/\D/g, "").slice(0, 6);
}
