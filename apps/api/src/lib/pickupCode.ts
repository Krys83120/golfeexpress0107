import { randomInt, timingSafeEqual } from "crypto";
import { UserRole } from "@golfeexpress/types";
import { ApiError } from "@/middleware/auth";

/**
 * Remise Pro -> Livreur par scan de QR code (06/10/2026).
 *
 * Contexte : un commerçant a signalé qu'un livreur pouvait repartir avec le
 * sac sans jamais valider la récupération dans l'app -- la commande restait
 * bloquée en RIDER_ASSIGNED, finissait annulée/remboursée, et le livreur
 * gardait le repas. Avant ce correctif, le passage RIDER_ASSIGNED ->
 * PICKED_UP était déclaré par le livreur SEUL (un simple bouton), sans
 * aucune preuve que le commerçant lui avait remis la commande.
 *
 * Désormais : chaque commande reçoit un code à 6 chiffres (Order.pickupCode)
 * imprimé en QR code sur le ticket de préparation. Le livreur le scanne chez
 * le commerçant (POST /api/order-pickup) ; seul ce scan fait passer la
 * commande en livraison. Le code n'est JAMAIS renvoyé au livreur par l'API
 * (voir sanitizeOrderForRole) -- il ne peut le lire que sur le ticket.
 */

/** Distance maximale (km) entre le livreur et le commerçant au moment du scan. */
export const PICKUP_MAX_DISTANCE_KM = 0.5;

/**
 * Ancienneté maximale (ms) de la dernière position GPS connue du livreur
 * (Rider.currentLocationUpdatedAt) pour qu'elle serve de repli quand son
 * téléphone n'envoie pas sa position avec le scan.
 */
export const PICKUP_RIDER_LOCATION_MAX_AGE_MS = 10 * 60 * 1000;

/** Format de la chaîne encodée dans le QR code : "DYGPICKUP|<orderId>|<code>". */
export const PICKUP_QR_PREFIX = "DYGPICKUP";

/** Code à 6 chiffres, tiré avec un générateur cryptographique (jamais Math.random). */
export function generatePickupCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Comparaison en temps constant, insensible aux espaces saisis à la main ("483 920"). */
export function pickupCodesMatch(expected: string, provided: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(provided.replace(/\s+/g, ""));
  return a.length === b.length && timingSafeEqual(a, b);
}

interface OrderWithCodes {
  deliveryCode?: string | null;
  pickupCode?: string | null;
}

/**
 * Retire d'une commande les codes secrets que le rôle appelant n'a pas à
 * connaître, et ajoute `pickupScanRequired` (booléen, sans le code) :
 *  - deliveryCode (client -> livreur, valide la LIVRAISON) : client + admin
 *    uniquement. Avant ce correctif, GET /api/orders renvoyait toutes les
 *    colonnes de la commande au livreur, code de livraison compris -- le
 *    livreur pouvait le lire dans la réponse réseau et valider la livraison
 *    sans jamais voir le client.
 *  - pickupCode (Pro -> livreur, valide la RÉCUPÉRATION) : Pro/employé +
 *    admin uniquement.
 */
export function sanitizeOrderForRole<T extends OrderWithCodes>(order: T, role: UserRole | string) {
  const { deliveryCode, pickupCode, ...rest } = order;
  const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
  const canSeeDeliveryCode = isAdmin || role === UserRole.CLIENT;
  const canSeePickupCode = isAdmin || role === UserRole.PRO || role === UserRole.PRO_EMPLOYEE;
  return {
    ...rest,
    ...(canSeeDeliveryCode ? { deliveryCode } : {}),
    ...(canSeePickupCode ? { pickupCode } : {}),
    pickupScanRequired: pickupCode != null,
  };
}

/**
 * Garde-fou à appeler dans orders/[orderId]/status/route.ts, pour toute
 * demande d'un LIVREUR de passer la commande en PICKED_UP ou IN_DELIVERY :
 * refuse tant que le scan du QR n'a pas été validé par le serveur, sauf pour
 * les commandes antérieures au déploiement (pickupCode null) qui gardent
 * l'ancien flux manuel. Empêche de contourner l'app en appelant l'API
 * directement.
 */
export function assertPickupVerifiedForRider(order: { pickupCode?: string | null; pickupVerifiedAt?: Date | null }) {
  if (order.pickupCode && !order.pickupVerifiedAt) {
    throw new ApiError(
      403,
      "Récupération non validée : scannez le QR code du ticket chez le commerçant pour prendre la commande."
    );
  }
}
