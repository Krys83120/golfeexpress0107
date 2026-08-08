import { EarningType, WithdrawalStatus } from "@golfeexpress/types";

/**
 * Dictionnaires d'affichage (emoji/libellé/couleur) — pas des données mock,
 * juste le mapping visuel des enums renvoyés par l'API. Anciennement dans
 * mockEarnings.ts, extraits ici maintenant que les données réelles viennent
 * de useEarningsStore.
 */
export const EARNING_TYPE_LABELS: Record<EarningType, { label: string; emoji: string }> = {
  [EarningType.DELIVERY_FEE]: { label: "Frais de livraison", emoji: "🛵" },
  [EarningType.TIP]: { label: "Pourboire", emoji: "💝" },
  [EarningType.BONUS]: { label: "Bonus", emoji: "🎁" },
  [EarningType.INCENTIVE]: { label: "Incentive", emoji: "🚀" },
};

export const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, { label: string; color: string }> = {
  [WithdrawalStatus.PENDING]: { label: "En attente", color: "#FF6B35" },
  [WithdrawalStatus.PROCESSING]: { label: "En cours", color: "#2196F3" },
  [WithdrawalStatus.COMPLETED]: { label: "Terminé", color: "#2ECC71" },
  [WithdrawalStatus.FAILED]: { label: "Échoué", color: "#F44336" },
};
