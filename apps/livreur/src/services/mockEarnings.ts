import { EarningType, EarningStatus, WithdrawalStatus } from "@golfeexpress/types";

export interface EarningHistoryEntry {
  id: string;
  orderNumber: string;
  type: EarningType;
  amount: number;
  status: EarningStatus;
  dateLabel: string;
}

export const MOCK_EARNINGS_HISTORY: EarningHistoryEntry[] = [
  { id: "earn-1", orderNumber: "#GE-10234", type: EarningType.DELIVERY_FEE, amount: 8.5, status: EarningStatus.AVAILABLE, dateLabel: "Aujourd'hui, 18:42" },
  { id: "earn-2", orderNumber: "#GE-10234", type: EarningType.TIP, amount: 2.0, status: EarningStatus.AVAILABLE, dateLabel: "Aujourd'hui, 18:42" },
  { id: "earn-3", orderNumber: "#GE-10220", type: EarningType.DELIVERY_FEE, amount: 6.9, status: EarningStatus.AVAILABLE, dateLabel: "Aujourd'hui, 16:15" },
  { id: "earn-4", orderNumber: "#GE-10210", type: EarningType.DELIVERY_FEE, amount: 9.2, status: EarningStatus.AVAILABLE, dateLabel: "Aujourd'hui, 14:30" },
  { id: "earn-5", orderNumber: "—", type: EarningType.BONUS, amount: 15.0, status: EarningStatus.PAID, dateLabel: "Hier" },
  { id: "earn-6", orderNumber: "#GE-10180", type: EarningType.INCENTIVE, amount: 5.0, status: EarningStatus.PAID, dateLabel: "22 juin" },
];

export const EARNING_TYPE_LABELS: Record<EarningType, { label: string; emoji: string }> = {
  [EarningType.DELIVERY_FEE]: { label: "Frais de livraison", emoji: "🛵" },
  [EarningType.TIP]: { label: "Pourboire", emoji: "💝" },
  [EarningType.BONUS]: { label: "Bonus", emoji: "🎁" },
  [EarningType.INCENTIVE]: { label: "Incentive", emoji: "🚀" },
};

export interface WithdrawalHistoryEntry {
  id: string;
  amount: number;
  status: WithdrawalStatus;
  dateLabel: string;
}

export const MOCK_WITHDRAWALS_HISTORY: WithdrawalHistoryEntry[] = [
  { id: "wd-1", amount: 250.0, status: WithdrawalStatus.COMPLETED, dateLabel: "18 juin" },
  { id: "wd-2", amount: 180.5, status: WithdrawalStatus.COMPLETED, dateLabel: "11 juin" },
];

export const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, { label: string; color: string }> = {
  [WithdrawalStatus.PENDING]: { label: "En attente", color: "#FF6B35" },
  [WithdrawalStatus.PROCESSING]: { label: "En cours", color: "#2196F3" },
  [WithdrawalStatus.COMPLETED]: { label: "Terminé", color: "#2ECC71" },
  [WithdrawalStatus.FAILED]: { label: "Échoué", color: "#F44336" },
};

export const EARNINGS_SUMMARY = {
  availableBalance: 87.5,
  pendingBalance: 12.4,
  weekTotal: 412.3,
  monthTotal: 1680.0,
};
