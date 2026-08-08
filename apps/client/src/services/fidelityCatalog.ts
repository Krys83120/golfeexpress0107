/**
 * Catalogue de récompenses fidélité et configuration des paliers — pas des
 * données utilisateur mais la config produit du programme fidélité (pas de
 * table dédiée en base pour l'instant, à l'image des chips de catégories).
 * Les points réels du client viennent de Client.fidelityPoints via l'API.
 */
export interface FidelityReward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  emoji: string;
}

export const FIDELITY_REWARDS: FidelityReward[] = [
  { id: "rwd-1", title: "5€ de réduction", description: "Sur votre prochaine commande", pointsCost: 100, emoji: "💶" },
  { id: "rwd-2", title: "Livraison offerte", description: "Sur votre prochaine commande", pointsCost: 60, emoji: "🛵" },
  { id: "rwd-3", title: "10€ de réduction", description: "Sur votre prochaine commande", pointsCost: 180, emoji: "💰" },
  { id: "rwd-4", title: "Café offert", description: "Chez un partenaire participant", pointsCost: 40, emoji: "☕" },
];

export const FIDELITY_TIER = {
  pointsToNextTier: 300, // seuil du prochain palier
  nextTierName: "Statut Gold",
};
