import { create } from "zustand";
import type { PendingValidation } from "@/services/pendingValidationMapper";
import { proToPendingValidation, riderToPendingValidation } from "@/services/pendingValidationMapper";
import { fetchPendingValidations, validatePro, validateRider } from "@/services/validationsApi";

interface AdminDashboardState {
  pendingValidations: PendingValidation[];
  status: "idle" | "loading" | "loaded" | "error";
  error: string | null;

  loadPendingValidations: () => Promise<void>;
  approve: (id: string, kind: "PRO" | "RIDER") => Promise<void>;
  reject: (id: string, kind: "PRO" | "RIDER") => Promise<void>;
}

export const useAdminDashboardStore = create<AdminDashboardState>((set, get) => ({
  pendingValidations: [],
  status: "idle",
  error: null,

  loadPendingValidations: async () => {
    set({ status: "loading", error: null });
    try {
      const { pendingPros, pendingRiders } = await fetchPendingValidations();
      const validations = [
        ...pendingPros.map(proToPendingValidation),
        ...pendingRiders.map(riderToPendingValidation),
      ];
      set({ pendingValidations: validations, status: "loaded" });
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : "Impossible de charger les validations." });
    }
  },

  approve: async (id, kind) => {
    if (kind === "PRO") await validatePro(id, true);
    else await validateRider(id, true);
    set((state) => ({ pendingValidations: state.pendingValidations.filter((v) => v.id !== id) }));
  },

  reject: async (id, kind) => {
    if (kind === "PRO") await validatePro(id, false);
    else await validateRider(id, false);
    set((state) => ({ pendingValidations: state.pendingValidations.filter((v) => v.id !== id) }));
  },
}));
