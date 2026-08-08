import { create } from "zustand";
import { fetchMyStats, type RiderStats } from "@/services/ridersApi";

interface RiderStatsState {
  stats: RiderStats | null;
  status: "idle" | "loading" | "loaded" | "error";
  error: string | null;
  load: () => Promise<void>;
}

export const useRiderStatsStore = create<RiderStatsState>((set) => ({
  stats: null,
  status: "idle",
  error: null,

  load: async () => {
    set({ status: "loading", error: null });
    try {
      const stats = await fetchMyStats();
      set({ stats, status: "loaded" });
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : "Impossible de charger vos statistiques." });
    }
  },
}));
