// NOTE: pas de modèle Payout en base — cette liste reste un exemple
// illustratif tant que les versements automatiques ne sont pas implémentés
// côté backend (voir apps/api, modèle Prisma à créer le cas échéant).
export interface PlatformPayoutRow {
  id: string;
  recipientType: "PRO" | "RIDER";
  recipientName: string;
  amount: number;
  status: "paid" | "pending";
  dateLabel: string;
}

export const MOCK_PLATFORM_PAYOUTS: PlatformPayoutRow[] = [
  { id: "pp1", recipientType: "PRO", recipientName: "Poke Paradise", amount: 5814.42, status: "paid", dateLabel: "23 juin" },
  { id: "pp2", recipientType: "PRO", recipientName: "Boucherie du Port", amount: 2720.0, status: "paid", dateLabel: "23 juin" },
  { id: "pp3", recipientType: "RIDER", recipientName: "Lucas Bertrand", amount: 412.3, status: "paid", dateLabel: "23 juin" },
  { id: "pp4", recipientType: "RIDER", recipientName: "Karim Saidi", amount: 380.5, status: "pending", dateLabel: "30 juin" },
];
