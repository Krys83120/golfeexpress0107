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
 * 7 minutes correspond à un temps de trajet livreur → commerçant courant
 * sur la zone du Golfe de Saint-Tropez.
 *
 * TODO: remplacer par un calcul par livreur (distance réelle / vitesse
 * moyenne selon vehicleType) une fois le matching plus fin nécessaire.
 */
export const RIDER_SEARCH_BUFFER_MINUTES = 7;

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
