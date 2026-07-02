export interface PayoutEntry {
  id: string;
  periodLabel: string;
  grossAmount: number;
  commission: number;
  netAmount: number;
  status: "paid" | "pending";
  dateLabel: string;
}

export const MOCK_PAYOUTS: PayoutEntry[] = [
  { id: "pay-1", periodLabel: "Semaine du 16 au 22 juin", grossAmount: 1860.4, commission: 279.06, netAmount: 1581.34, status: "paid", dateLabel: "23 juin" },
  { id: "pay-2", periodLabel: "Semaine du 9 au 15 juin", grossAmount: 1640.2, commission: 246.03, netAmount: 1394.17, status: "paid", dateLabel: "16 juin" },
  { id: "pay-3", periodLabel: "Semaine du 23 au 29 juin", grossAmount: 1248.0, commission: 187.2, netAmount: 1060.8, status: "pending", dateLabel: "À venir" },
];

export const FINANCE_SUMMARY = {
  commissionRate: 0.15,
  subscriptionType: "PREMIUM" as const,
  monthGross: 6840.5,
  monthCommission: 1026.08,
  monthNet: 5814.42,
  nextPayoutAmount: 1060.8,
  nextPayoutDateLabel: "30 juin",
};
