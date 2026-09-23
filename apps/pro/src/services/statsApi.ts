import { apiFetch, apiFetchBlob } from "@/services/apiClient";

export type StatsPeriod = "today" | "week" | "month" | "year" | "all";

export interface ProductStat {
  productName: string;
  quantitySold: number;
  revenue: number;
  orderCount: number;
}

export interface StatsSummary {
  orderCount: number;
  revenueTotal: number;
  avgBasket: number;
}

export interface StatsResponse {
  period: StatsPeriod;
  rangeLabel: string;
  summary: StatsSummary;
  products: ProductStat[];
}

/** GET /api/pros/me/stats?period=... */
export async function fetchMyStats(period: StatsPeriod): Promise<StatsResponse> {
  return apiFetch<StatsResponse>(`/api/pros/me/stats?period=${period}`);
}

/** GET /api/pros/me/stats/export?period=... -- CSV téléchargeable (bilan par produit). */
export async function exportMyStats(period: StatsPeriod): Promise<Blob> {
  return apiFetchBlob(`/api/pros/me/stats/export?period=${period}`);
}
