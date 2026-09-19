import { create } from "zustand";
import { persist } from "zustand/middleware";
import { NOTIFICATION_SOUNDS, getSoundById, playSoundRepeated, createCustomSound } from "@/services/notificationSounds";

interface NotificationSettingsState {
  /** Id du son choisi (voir notificationSounds.ts), ou "custom" pour le son uploadé ci-dessous. Stocké par appareil, pas par compte Pro : chaque tablette peut avoir son propre son. */
  soundId: string;
  enabled: boolean;
  /** Nombre de répétitions du motif sonore (1 à 5) — permet de rallonger l'alerte si elle est trop courte pour être entendue depuis la cuisine/l'arrière-boutique. */
  repeatCount: number;
  /** Imprime automatiquement une étiquette dès qu'une nouvelle commande arrive, sans action manuelle. */
  autoPrint: boolean;

  /**
   * Son personnalisé uploadé par le Pro (19/09/2026, demande de Krys) --
   * null tant qu'aucun n'a été ajouté sur CET appareil (voir
   * uploadNotificationSound dans uploadsApi.ts). customSoundDuration est
   * mesurée une seule fois à l'upload (voir probeAudioDuration) plutôt que
   * recalculée à chaque lecture.
   */
  customSoundUrl: string | null;
  customSoundLabel: string | null;
  customSoundDuration: number;

  setSoundId: (id: string) => void;
  setEnabled: (enabled: boolean) => void;
  setRepeatCount: (count: number) => void;
  setAutoPrint: (autoPrint: boolean) => void;
  setCustomSound: (url: string, label: string, durationSeconds: number) => void;
  clearCustomSound: () => void;
  playSelectedSound: () => void;
}

export const useNotificationSettingsStore = create<NotificationSettingsState>()(
  persist(
    (set, get) => ({
      // NOTIFICATION_SOUNDS[0] est "nouvelle-commande" (fichier mp3 fourni par
      // Krys, voir notificationSounds.ts) -- devenu le son par défaut le
      // 19/09/2026. IMPORTANT : ce store est persisté par appareil
      // (localStorage, voir `name` plus bas) -- ce changement de valeur par
      // défaut ne s'applique qu'aux appareils n'ayant JAMAIS enregistré de
      // préférence ici. Un appareil ayant déjà un soundId en localStorage
      // garde son choix actuel tant que le Pro ne le change pas lui-même.
      soundId: NOTIFICATION_SOUNDS[0].id,
      enabled: true,
      repeatCount: 1,
      autoPrint: false,

      customSoundUrl: null,
      customSoundLabel: null,
      customSoundDuration: 1.5,

      setSoundId: (id) => set({ soundId: id }),
      setEnabled: (enabled) => set({ enabled }),
      setRepeatCount: (count) => set({ repeatCount: count }),
      setAutoPrint: (autoPrint) => set({ autoPrint }),

      // Sélectionne automatiquement le son personnalisé dès qu'il est
      // uploadé -- évite d'avoir à re-cliquer sur le radio juste après.
      setCustomSound: (url, label, durationSeconds) =>
        set({ customSoundUrl: url, customSoundLabel: label, customSoundDuration: durationSeconds, soundId: "custom" }),

      // Si le son personnalisé était sélectionné au moment où il est retiré,
      // on retombe sur le premier son par défaut plutôt que de laisser
      // soundId pointer vers un son qui n'existe plus.
      clearCustomSound: () =>
        set((state) => ({
          customSoundUrl: null,
          customSoundLabel: null,
          soundId: state.soundId === "custom" ? NOTIFICATION_SOUNDS[0].id : state.soundId,
        })),

      playSelectedSound: () => {
        const state = get();
        if (!state.enabled) return;
        if (state.soundId === "custom" && state.customSoundUrl) {
          playSoundRepeated(
            createCustomSound(state.customSoundUrl, state.customSoundLabel ?? "Son personnalisé", state.customSoundDuration),
            state.repeatCount
          );
          return;
        }
        playSoundRepeated(getSoundById(state.soundId), state.repeatCount);
      },
    }),
    { name: "golfeexpress-pro-notification-settings" }
  )
);
