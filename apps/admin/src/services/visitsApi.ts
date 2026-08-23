import { apiFetch } from "@/services/apiClient";
import { AppSource } from "@golfeexpress/types";

export type VisitPeriod = "day" | "week" | "month";

export interface VisitTrendPoint {
  label: string;
  WWW: number;
  CLIENT: number;
  PRO: number;
  LIVREUR: number;
}

export interface VisitTopPage {
  path: string;
  count: number;
}

export interface VisitDeviceBreakdown {
  mobile: number;
  desktop: number;
  unknown: number;
}

export interface VisitStats {
  period: VisitPeriod;
  windowDays: number;
  totalsByApp: Record<AppSource, number>;
  trend: VisitTrendPoint[];
  topPages: VisitTopPage[];
  deviceBreakdown: Record<AppSource, VisitDeviceBreakdown>;
}

/**
 * GET /api/admin/analytics/visits -- agrégation calculée côté serveur (voir
 * cette route dans apps/api pour le détail : total de visites par app sur la
 * fenêtre, tendance par bucket, pages les plus visitées du site vitrine,
 * répartition mobile/desktop). Jamais de lignes AppVisit brutes renvoyées au
 * navigateur, contrairement à basketStats.ts qui agrège côté client -- le
 * volume d'événements de visite peut devenir bien plus important que le
 * volume de commandes.
 */
export function fetchVisitStats(period: VisitPeriod): Promise<VisitStats> {
  return apiFetch<VisitStats>(`/api/admin/analytics/visits?period=${period}`);
}
