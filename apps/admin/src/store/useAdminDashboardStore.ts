import { create } from "zustand";
import type { PendingValidation } from "@/services/pendingValidationMapper";
import { proToPendingValidation, riderToPendingValidation } from "@/services/pendingValidationMapper";
import { fetchPendingValidations, validatePro, validateRider, type PendingPro, type PendingRider } from "@/services/validationsApi";

interface AdminDashboardState {
  pendingValidations: PendingValidation[];
  // Entités complètes conservées à côté de la vue simplifiée
  // PendingValidation — nécessaires pour ouvrir les fiches détaillées
  // (ProDetailModal / RiderDetailModal) avec toutes les données KYC,
  // plutôt que de refaire un appel réseau au clic.
  pendingProsRaw: PendingPro[];
  pendingRidersRaw: PendingRider[];
  status: "idle" | "loading" | "loaded" | "error";
  error: string | null;

  loadPendingValidations: () => Promise<void>;
  approve: (id: string, kind: "PRO" | "RIDER") => Promise<void>;
  reject: (id: string, kind: "PRO" | "RIDER", reason: string) => Promise<void>;
}

export const useAdminDashboardStore = create<AdminDashboardState>((set, get) => ({
  pendingValidations: [],
  pendingProsRaw: [],
  pendingRidersRaw: [],
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
      set({ pendingValidations: validations, pendingProsRaw: pendingPros, pendingRidersRaw: pendingRiders, status: "loaded" });
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : "Impossible de charger les validations." });
    }
  },

  approve: async (id, kind) => {
    if (kind === "PRO") await validatePro(id, true);
    else await validateRider(id, true);
    set((state) => ({
      pendingValidations: state.pendingValidations.filter((v) => v.id !== id),
      pendingProsRaw: state.pendingProsRaw.filter((p) => p.id !== id),
      pendingRidersRaw: state.pendingRidersRaw.filter((r) => r.id !== id),
    }));
  },

  reject: async (id, kind, reason) => {
    if (kind === "PRO") await validatePro(id, false, reason);
    else await validateRider(id, false, reason);
    set((state) => ({
      pendingValidations: state.pendingValidations.filter((v) => v.id !== id),
      pendingProsRaw: state.pendingProsRaw.filter((p) => p.id !== id),
      pendingRidersRaw: state.pendingRidersRaw.filter((r) => r.id !== id),
    }));
  },
}));
