import { create } from "zustand";
import {
  fetchMyEarnings,
  fetchMyWithdrawals,
  requestWithdrawal,
  type EarningEntry,
  type EarningsSummary,
  type WithdrawalEntry,
} from "@/services/ridersApi";

interface EarningsState {
  earnings: EarningEntry[];
  withdrawals: WithdrawalEntry[];
  summary: EarningsSummary | null;
  status: "idle" | "loading" | "loaded" | "error";
  withdrawStatus: "idle" | "loading" | "error";
  error: string | null;

  load: () => Promise<void>;
  withdraw: (amount: number) => Promise<void>;
}

export const useEarningsStore = create<EarningsState>((set, get) => ({
  earnings: [],
  withdrawals: [],
  summary: null,
  status: "idle",
  withdrawStatus: "idle",
  error: null,

  load: async () => {
    set({ status: "loading", error: null });
    try {
      const [{ earnings, summary }, withdrawals] = await Promise.all([fetchMyEarnings(), fetchMyWithdrawals()]);
      set({ earnings, summary, withdrawals, status: "loaded" });
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : "Impossible de charger vos gains." });
    }
  },

  withdraw: async (amount) => {
    set({ withdrawStatus: "loading", error: null });
    try {
      const withdrawal = await requestWithdrawal(amount);
      set((state) => ({
        withdrawals: [withdrawal, ...state.withdrawals],
        summary: state.summary ? { ...state.summary, availableBalance: state.summary.availableBalance - amount } : state.summary,
        withdrawStatus: "idle",
      }));
    } catch (err) {
      set({ withdrawStatus: "error", error: err instanceof Error ? err.message : "Le retrait a échoué." });
      throw err;
    }
  },
}));
