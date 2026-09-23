import { apiFetch, apiFetchBlob } from "@/services/apiClient";

export type StatsPeriod = "today" | "week" | "month" | "year" | "all" | "custom";

/** Plage personnalisée (23/09/2026) -- dates brutes "YYYY-MM-DD" des <input type="date">, envoyées telles quelles au serveur (voir resolveStatsRange côté statsPeriods.ts). */
export interface StatsCustomRange {
  from: string;
  to: string;
}

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
  /** Plage de dates réellement couverte par les ventes trouvées (ex: "Du 16 sept. 2026 au 23 sept. 2026"), null si aucune vente sur la période. */
  dateRangeLabel: string | null;
  summary: StatsSummary;
  products: ProductStat[];
}

function buildStatsParams(period: StatsPeriod, range?: StatsCustomRange): URLSearchParams {
  const params = new URLSearchParams({ period });
  if (range) {
    params.set("from", range.from);
    params.set("to", range.to);
  }
  return params;
}

/** GET /api/pros/me/stats?period=... -- `range` requis (et utilisé) seulement pour period="custom". */
export async function fetchMyStats(period: StatsPeriod, range?: StatsCustomRange): Promise<StatsResponse> {
  return apiFetch<StatsResponse>(`/api/pros/me/stats?${buildStatsParams(period, range).toString()}`);
}

/** GET /api/pros/me/stats/export?period=... -- CSV téléchargeable (bilan par produit). */
export async function exportMyStats(period: StatsPeriod, range?: StatsCustomRange): Promise<Blob> {
  return apiFetchBlob(`/api/pros/me/stats/export?${buildStatsParams(period, range).toString()}`);
}
