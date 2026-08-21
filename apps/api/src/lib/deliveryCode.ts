/**
 * Génère le code de remise à 4 chiffres que le client doit communiquer au
 * livreur pour valider la livraison (voir Order.deliveryCode). Créé une
 * seule fois à la commande (POST /api/orders) et jamais régénéré ensuite —
 * envoyé au client par email (sendOrderConfirmedEmail / sendOrderOnTheWayEmail)
 * et affiché dans l'app (TrackingScreen), puis saisi par le livreur en fin
 * de livraison à titre de vérification (voir orders/[orderId]/status/route.ts).
 */
export function generateDeliveryCode(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}
