import { create } from "zustand";
import { persist } from "zustand/middleware";
import { NOTIFICATION_SOUNDS, getSoundById, playSoundRepeated } from "@/services/notificationSounds";

interface NotificationSettingsState {
  /** Id du son choisi (voir notificationSounds.ts). Stocké par appareil, pas par compte Pro : chaque tablette peut avoir son propre son. */
  soundId: string;
  enabled: boolean;
  /** Nombre de répétitions du motif sonore (1 à 5) — permet de rallonger l'alerte si elle est trop courte pour être entendue depuis la cuisine/l'arrière-boutique. */
  repeatCount: number;
  /** Imprime automatiquement une étiquette dès qu'une nouvelle commande arrive, sans action manuelle. */
  autoPrint: boolean;

  setSoundId: (id: string) => void;
  setEnabled: (enabled: boolean) => void;
  setRepeatCount: (count: number) => void;
  setAutoPrint: (autoPrint: boolean) => void;
  playSelectedSound: () => void;
}

export const useNotificationSettingsStore = create<NotificationSettingsState>()(
  persist(
    (set, get) => ({
      soundId: NOTIFICATION_SOUNDS[0].id,
      enabled: true,
      repeatCount: 1,
      autoPrint: false,

      setSoundId: (id) => set({ soundId: id }),
      setEnabled: (enabled) => set({ enabled }),
      setRepeatCount: (count) => set({ repeatCount: count }),
      setAutoPrint: (autoPrint) => set({ autoPrint }),

      playSelectedSound: () => {
        if (!get().enabled) return;
        playSoundRepeated(getSoundById(get().soundId), get().repeatCount);
      },
    }),
    { name: "golfeexpress-pro-notification-settings" }
  )
);
