export interface FidelityReward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  emoji: string;
}

export const MOCK_FIDELITY_REWARDS: FidelityReward[] = [
  { id: "rwd-1", title: "5€ de réduction", description: "Sur votre prochaine commande", pointsCost: 100, emoji: "💶" },
  { id: "rwd-2", title: "Livraison offerte", description: "Sur votre prochaine commande", pointsCost: 60, emoji: "🛵" },
  { id: "rwd-3", title: "10€ de réduction", description: "Sur votre prochaine commande", pointsCost: 180, emoji: "💰" },
  { id: "rwd-4", title: "Café offert", description: "Chez un partenaire participant", pointsCost: 40, emoji: "☕" },
];

export interface FidelityHistoryEntry {
  id: string;
  label: string;
  points: number; // positif = gagné, négatif = dépensé
  dateLabel: string;
}

export const MOCK_FIDELITY_HISTORY: FidelityHistoryEntry[] = [
  { id: "fh-1", label: "Commande #GE-10234", points: 35, dateLabel: "Aujourd'hui" },
  { id: "fh-2", label: "Commande #GE-10198", points: 42, dateLabel: "Hier" },
  { id: "fh-3", label: "Réduction 5€ utilisée", points: -100, dateLabel: "8 juin" },
  { id: "fh-4", label: "Parrainage validé", points: 50, dateLabel: "2 juin" },
];

export const FIDELITY_DEMO = {
  currentPoints: 235,
  pointsToNextTier: 65, // jusqu'au prochain palier (300 pts)
  nextTierName: "Statut Gold",
  referralCode: "KRYS2026",
};
