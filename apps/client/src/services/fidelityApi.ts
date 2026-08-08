import { apiFetch } from "@/services/apiClient";

export interface FidelityHistoryEntry {
  orderNumber: string;
  points: number;
  date: string;
}

/** GET /api/clients/me/fidelity-history */
export async function fetchFidelityHistory(): Promise<FidelityHistoryEntry[]> {
  const data = await apiFetch<{ history: FidelityHistoryEntry[] }>("/api/clients/me/fidelity-history");
  return data.history;
}
