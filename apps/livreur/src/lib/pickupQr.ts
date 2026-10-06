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

/**
 * QR code de remise affiché dans l'app Commander du client (06/10/2026) :
 * "DYGDELIVERY|<id de la commande>|<code à 4 chiffres>". Ce format doit rester
 * identique à celui produit par apps/client/src/lib/deliveryQr.ts. Le livreur
 * le scanne à la porte ; le code part ensuite dans la validation de livraison
 * habituelle (PATCH /api/orders/:id/status, champ deliveryCode).
 */
export const DELIVERY_QR_PREFIX = "DYGDELIVERY";

/** Retourne null si le texte scanné n'est pas un QR de remise client Do You Geckoo. */
export function parseDeliveryQr(text: string): ParsedPickupQr | null {
  const parts = text.trim().split("|");
  if (parts.length !== 3 || parts[0] !== DELIVERY_QR_PREFIX) return null;
  const [, orderId, code] = parts;
  if (!orderId || !/^\d{4}$/.test(code)) return null;
  return { orderId, code };
}

/** Garde uniquement les chiffres d'une saisie manuelle ("483 920" -> "483920"), tronqués à `length` chiffres. */
export function normalizeManualCode(input: string, length = 6): string {
  return input.replace(/\D/g, "").slice(0, length);
}
