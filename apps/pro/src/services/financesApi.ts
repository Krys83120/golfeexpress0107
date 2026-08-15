import { apiFetch, apiFetchBlob } from "@/services/apiClient";

export type ZReportPeriod = "day" | "week" | "month";

/** GET /api/pros/me/z-report?period=...&date=... — renvoie le PDF du rapport Z. */
export async function downloadZReport(period: ZReportPeriod, date: string): Promise<Blob> {
  return apiFetchBlob(`/api/pros/me/z-report?period=${period}&date=${date}`);
}

/** POST /api/pros/me/z-report/send — envoie le rapport Z par email au Pro connecté. */
export async function emailZReport(period: ZReportPeriod, date: string): Promise<{ sent: boolean; to: string }> {
  return apiFetch<{ sent: boolean; to: string }>("/api/pros/me/z-report/send", { method: "POST", body: { period, date } });
}

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
