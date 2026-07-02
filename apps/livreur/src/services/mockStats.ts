export interface WeeklyDeliveryPoint {
  label: string;
  deliveries: number;
}

export const MOCK_WEEKLY_DELIVERIES: WeeklyDeliveryPoint[] = [
  { label: "Lun", deliveries: 6 },
  { label: "Mar", deliveries: 8 },
  { label: "Mer", deliveries: 5 },
  { label: "Jeu", deliveries: 9 },
  { label: "Ven", deliveries: 12 },
  { label: "Sam", deliveries: 15 },
  { label: "Dim", deliveries: 11 },
];

export const RIDER_STATS_SUMMARY = {
  totalDeliveries: 312,
  rating: 4.9,
  ratingCount: 287,
  acceptanceRate: 0.92,
  onTimeRate: 0.97,
  avgDeliveryMinutes: 22,
  memberSinceLabel: "Mars 2025",
};

export interface RiderBadge {
  emoji: string;
  title: string;
  description: string;
  unlocked: boolean;
}

export const MOCK_RIDER_BADGES: RiderBadge[] = [
  { emoji: "🏆", title: "Top livreur", description: "Top 10% du Golfe", unlocked: true },
  { emoji: "⚡", title: "Éclair", description: "100 livraisons en moins de 20 min", unlocked: true },
  { emoji: "🌟", title: "5 étoiles", description: "50 avis 5★ consécutifs", unlocked: true },
  { emoji: "🎯", title: "Précision", description: "99% de livraisons sans erreur", unlocked: false },
];
