import QRCode from "qrcode";

/**
 * QR code de remise Pro -> Livreur (06/10/2026) -- voir Order.pickupCode côté
 * prisma/schema.prisma et apps/api/src/lib/pickupCode.ts pour le raisonnement.
 *
 * Le QR encode "DYGPICKUP|<id de la commande>|<code à 6 chiffres>" : l'app
 * Livreur le décode, vérifie que l'id correspond à sa commande en cours,
 * puis envoie le code à POST /api/order-pickup. Ce format doit rester
 * identique à celui lu par apps/livreur/src/components/PickupScanner.tsx.
 */
export const PICKUP_QR_PREFIX = "DYGPICKUP";

export function buildPickupQrPayload(orderId: string, code: string): string {
  return `${PICKUP_QR_PREFIX}|${orderId}|${code}`;
}

/** Image PNG (data URL) du QR code, utilisable dans un <img> ou dans le HTML du ticket imprimé. */
export function pickupQrDataUrl(orderId: string, code: string, widthPx = 320): Promise<string> {
  return QRCode.toDataURL(buildPickupQrPayload(orderId, code), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: widthPx,
  });
}

/** "483920" -> "483 920", plus lisible à dicter ou à saisir à la main. */
export function formatPickupCode(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}
