/**
 * QR code de remise affiché au client (06/10/2026) : "DYGDELIVERY|<id de la
 * commande>|<code à 4 chiffres>". Le livreur le scanne à la porte avec son app
 * pour valider la livraison, sans que le client ait à dicter son code. Ce
 * format doit rester identique à celui lu par
 * apps/livreur/src/lib/pickupQr.ts (parseDeliveryQr).
 */
export const DELIVERY_QR_PREFIX = "DYGDELIVERY";

export function buildDeliveryQrPayload(orderId: string, code: string): string {
  return `${DELIVERY_QR_PREFIX}|${orderId}|${code}`;
}
