import { create } from "zustand";

export type PeriodFilter = "today" | "week" | "month";

interface ProDashboardState {
  period: PeriodFilter;
  setPeriod: (period: PeriodFilter) => void;
}

export const useProDashboardStore = create<ProDashboardState>((set) => ({
  period: "today",
  setPeriod: (period) => set({ period }),
}));
