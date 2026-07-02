import { create } from "zustand";
import type { GlobalSettingRow } from "@/services/settingsApi";
import { fetchGlobalSettings, updateGlobalSetting } from "@/services/settingsApi";

interface AdminSettingsState {
  settings: GlobalSettingRow[];
  status: "idle" | "loading" | "loaded" | "error";
  error: string | null;

  loadSettings: () => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;
}

export const useAdminSettingsStore = create<AdminSettingsState>((set) => ({
  settings: [],
  status: "idle",
  error: null,

  loadSettings: async () => {
    set({ status: "loading", error: null });
    try {
      const settings = await fetchGlobalSettings();
      set({ settings, status: "loaded" });
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : "Impossible de charger les paramètres." });
    }
  },

  updateSetting: async (key, value) => {
    const updated = await updateGlobalSetting(key, value);
    set((state) => ({ settings: state.settings.map((s) => (s.key === key ? updated : s)) }));
  },
}));
