import { apiFetch } from "@/services/apiClient";

export interface AdminStats {
  platformRevenue7d: number;
  gmv7d: number;
  orderCount7d: number;
  activeProCount: number;
  activeRiderCount: number;
  revenueByDay: { label: string; platform: number; pros: number; riders: number }[];
  categoryBreakdown: { category: string; revenue: number; orderCount: number }[];
}

/** GET /api/admin/stats */
export async function fetchAdminStats(): Promise<AdminStats> {
  return apiFetch<AdminStats>("/api/admin/stats");
}

export interface SupportedCity {
  name: string;
  activePros: number;
  activeRiders: number;
}

/** GET /api/admin/cities */
export async function fetchSupportedCities(): Promise<SupportedCity[]> {
  const data = await apiFetch<{ cities: SupportedCity[] }>("/api/admin/cities");
  return data.cities;
}

export interface LiveRiderPosition {
  id: string;
  lat: number;
  lng: number;
  vehicleType: string;
  isDelivering: boolean;
}

/** GET /api/admin/live-riders */
export async function fetchLiveRiders(): Promise<LiveRiderPosition[]> {
  const data = await apiFetch<{ riders: LiveRiderPosition[] }>("/api/admin/live-riders");
  return data.riders;
}
