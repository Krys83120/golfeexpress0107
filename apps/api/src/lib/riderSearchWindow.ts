/**
 * Nombre de minutes avant l'heure de fin de préparation estimée à partir
 * duquel une commande devient visible dans la liste des commandes
 * disponibles pour les livreurs, plutôt que d'attendre qu'elle soit
 * officiellement marquée "prête".
 *
 * Simplification volontaire : ce délai est une valeur fixe plutôt que
 * calculée dynamiquement à partir de la distance/position de chaque
 * livreur candidat (ce qui nécessiterait un vrai moteur de matching avec
 * calcul d'ETA par livreur — hors scope pour cette première version).
 *
 * Réduit de 7 à 3 minutes le 23/09/2026 (demande de Krys, suite à une
 * commande restée bloquée en RIDER_ASSIGNED sans jamais être marquée prête
 * par le Pro) : plus la fenêtre est large, plus une commande peut rester
 * assignée longtemps à un livreur avant que le Pro n'ait réellement fini —
 * 3 minutes reste utile pour que le livreur arrive à temps sans trop
 * anticiper. Voir aussi orders/[orderId]/status/route.ts, qui bloque
 * désormais la transition PICKED_UP tant que readyAt n'est pas posé, pour
 * qu'un livreur assigné trop tôt ne puisse plus jamais récupérer une
 * commande pas encore physiquement prête.
 *
 * TODO: remplacer par un calcul par livreur (distance réelle / vitesse
 * moyenne selon vehicleType) une fois le matching plus fin nécessaire.
 */
export const RIDER_SEARCH_BUFFER_MINUTES = 3;

/**
 * Calcule si une commande en préparation doit déjà être visible aux
 * livreurs, à partir de l'heure de début de préparation et du temps de
 * préparation estimé par le Pro.
 */
export function isWithinRiderSearchWindow(preparingStartedAt: Date, estimatedPrepMinutes: number): boolean {
  const estimatedReadyAt = preparingStartedAt.getTime() + estimatedPrepMinutes * 60_000;
  const searchStartAt = estimatedReadyAt - RIDER_SEARCH_BUFFER_MINUTES * 60_000;
  return Date.now() >= searchStartAt;
}
