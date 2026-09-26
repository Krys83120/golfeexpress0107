import { create } from "zustand";
import type { PendingValidation } from "@/services/pendingValidationMapper";
import { proToPendingValidation, riderToPendingValidation } from "@/services/pendingValidationMapper";
import {
  fetchPendingValidations,
  validatePro,
  validateRider,
  sendProDossierReminder,
  sendRiderDossierReminder,
  type PendingPro,
  type PendingRider,
} from "@/services/validationsApi";

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
  /**
   * Relance "complétez votre dossier" (ajout du 26/09/2026, demande de
   * Krys) -- contrairement à approve/reject, ne retire PAS l'entrée de la
   * liste (le compte reste PENDING) : on met juste à jour lastReminderAt
   * localement, en remappant via proToPendingValidation/
   * riderToPendingValidation pour rester cohérent avec loadPendingValidations
   * plutôt que de dupliquer la logique de mapping ici.
   */
  remind: (id: string, kind: "PRO" | "RIDER") => Promise<void>;
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

  remind: async (id, kind) => {
    const { sentAt } = kind === "PRO" ? await sendProDossierReminder(id) : await sendRiderDossierReminder(id);
    set((state) => {
      if (kind === "PRO") {
        const pendingProsRaw = state.pendingProsRaw.map((p) =>
          p.id === id ? { ...p, lastDossierReminderAt: sentAt } : p
        );
        return {
          pendingProsRaw,
          pendingValidations: [
            ...pendingProsRaw.map(proToPendingValidation),
            ...state.pendingRidersRaw.map(riderToPendingValidation),
          ],
        };
      }
      const pendingRidersRaw = state.pendingRidersRaw.map((r) =>
        r.id === id ? { ...r, lastDossierReminderAt: sentAt } : r
      );
      return {
        pendingRidersRaw,
        pendingValidations: [
          ...state.pendingProsRaw.map(proToPendingValidation),
          ...pendingRidersRaw.map(riderToPendingValidation),
        ],
      };
    });
  },
}));
