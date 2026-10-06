import { randomInt } from "crypto";

/**
 * Génère le code de remise à 4 chiffres que le client doit communiquer au
 * livreur pour valider la livraison (voir Order.deliveryCode). Créé une
 * seule fois à la commande (POST /api/orders) et jamais régénéré ensuite —
 * envoyé au client par email (sendOrderConfirmedEmail / sendOrderOnTheWayEmail)
 * et affiché dans l'app (TrackingScreen), puis saisi par le livreur en fin
 * de livraison à titre de vérification (voir orders/[orderId]/status/route.ts).
 */
export function generateDeliveryCode(): string {
  // Tirage cryptographique (06/10/2026) : Math.random est prévisible, or ce code
  // est ce qui prouve la remise au client (voir aussi la limite d'essais dans
  // orders/[orderId]/status/route.ts, 10 000 combinaisons seulement).
  return String(randomInt(0, 10000)).padStart(4, "0");
}
