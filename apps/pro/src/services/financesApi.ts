import { apiFetch } from "@/services/apiClient";

export interface FinanceSummary {
  commissionRate: number;
  subscriptionType: string;
  monthGross: number;
  monthCommission: number;
  monthNet: number;
}

export interface WeeklyFinanceEntry {
  periodLabel: string;
  grossAmount: number;
  commission: number;
  netAmount: number;
  orderCount: number;
}

/** GET /api/pros/me/finances */
export async function fetchMyFinances(): Promise<{ summary: FinanceSummary; weeklyHistory: WeeklyFinanceEntry[] }> {
  return apiFetch<{ summary: FinanceSummary; weeklyHistory: WeeklyFinanceEntry[] }>("/api/pros/me/finances");
}
