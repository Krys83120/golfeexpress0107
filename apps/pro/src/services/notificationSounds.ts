// Sons de notification synthétisés directement dans le navigateur (Web
// Audio API) plutôt que des fichiers .mp3 externes : pas de fichier à
// héberger/charger, fonctionne même hors-ligne, et le volume/la tonalité
// restent cohérents sur tous les appareils.

export interface NotificationSound {
  id: string;
  label: string;
  /** Durée d'un seul passage du motif sonore, en secondes — sert à espacer les répétitions correctement. */
  durationSeconds: number;
  /** Joue un seul passage du motif. */
  play: () => void;
}

let sharedContext: AudioContext | null = null;

function getContext(): AudioContext {
  if (!sharedContext) {
    sharedContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  // Les navigateurs suspendent parfois le contexte tant qu'aucune interaction
  // utilisateur n'a eu lieu — resume() est un no-op si déjà actif.
  if (sharedContext.state === "suspended") {
    sharedContext.resume().catch(() => {});
  }
  return sharedContext;
}

/** Joue une note pure (sinusoïde) à une fréquence donnée, avec fondu d'entrée/sortie pour éviter les clics. */
function playTone(freq: number, startOffset: number, duration: number, volume = 0.3) {
  const ctx = getContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ctx.destination);

  const startTime = ctx.currentTime + startOffset;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

/**
 * Fichier audio réel embarqué avec l'application (apps/pro/public/sounds/...),
 * contrairement aux sons synthétisés ci-dessous (Web Audio API). Ajouté le
 * 19/09/2026 : Krys a fourni ce fichier elle-même ("Notification Nouvelle
 * Commande.mp3") pour remplacer le son par défaut, les sons synthétisés étant
 * jugés "trop basiques" -- et il est devenu LE son par défaut de tous les Pros
 * (voir soundId dans useNotificationSettingsStore.ts) après qu'un bug de
 * policy RLS sur le bucket Supabase Storage "notification-sounds" l'a
 * empêchée d'utiliser elle-même la fonctionnalité "son personnalisé" plus
 * bas dans ce fichier.
 */
const BUILT_IN_FILE_SOUND_URL = "/sounds/notification-nouvelle-commande.mp3";

export const NOTIFICATION_SOUNDS: NotificationSound[] = [
  {
    id: "nouvelle-commande",
    label: "📦 Nouvelle commande (par défaut)",
    // Durée réelle mesurée ~4.05s, arrondie à 4.2s pour laisser une marge de
    // sécurité dans l'espacement des répétitions (voir playSoundRepeated).
    durationSeconds: 4.2,
    play: () => {
      const audio = new Audio(BUILT_IN_FILE_SOUND_URL);
      audio.play().catch(() => {});
    },
  },
  {
    id: "ding",
    label: "🔔 Ding simple",
    durationSeconds: 0.35,
    play: () => playTone(880, 0, 0.35),
  },
  {
    id: "double-ding",
    label: "🔔🔔 Double ding",
    durationSeconds: 0.47,
    play: () => {
      playTone(880, 0, 0.2);
      playTone(880, 0.22, 0.25);
    },
  },
  {
    id: "chime",
    label: "🎐 Carillon montant",
    durationSeconds: 0.54,
    play: () => {
      playTone(523, 0, 0.18); // Do
      playTone(659, 0.12, 0.18); // Mi
      playTone(784, 0.24, 0.3); // Sol
    },
  },
  {
    id: "alert",
    label: "🚨 Alerte (urgent)",
    durationSeconds: 0.42,
    play: () => {
      playTone(1046, 0, 0.12, 0.35);
      playTone(880, 0.15, 0.12, 0.35);
      playTone(1046, 0.3, 0.12, 0.35);
    },
  },
  {
    id: "marimba",
    label: "🎵 Marimba douce",
    durationSeconds: 0.53,
    play: () => {
      playTone(392, 0, 0.25, 0.25); // Sol
      playTone(523, 0.18, 0.35, 0.25); // Do
    },
  },
];

export function getSoundById(id: string): NotificationSound {
  return NOTIFICATION_SOUNDS.find((s) => s.id === id) ?? NOTIFICATION_SOUNDS[0];
}

/** Silence entre deux répétitions successives du motif, en secondes. */
export const GAP_BETWEEN_REPEATS = 0.35;

/**
 * Silence entre l'alerte complète de DEUX commandes différentes qui arrivent
 * en même temps (voir playAlertForOrders dans useNotificationSettingsStore.ts,
 * ajouté le 22/09/2026 -- demande de Krys : "si plusieurs commandes, sonner
 * autant de fois de nouvelles commandes qui sont affichées"). Volontairement
 * un peu plus long que GAP_BETWEEN_REPEATS pour bien distinguer "encore une
 * répétition du même motif" de "c'est une AUTRE commande qui vient d'arriver".
 */
export const GAP_BETWEEN_ORDER_ALERTS = 0.6;

/**
 * Joue le motif sonore `repeatCount` fois d'affilée (espacées de
 * GAP_BETWEEN_REPEATS), pour permettre de rallonger la durée totale de
 * l'alerte sans avoir à étirer artificiellement chaque note (ce qui
 * sonnerait bizarre). Chaque répétition est planifiée à l'avance sur le
 * même AudioContext plutôt qu'avec des setTimeout, pour un timing précis.
 */
export function playSoundRepeated(sound: NotificationSound, repeatCount: number) {
  const step = sound.durationSeconds + GAP_BETWEEN_REPEATS;
  for (let i = 0; i < Math.max(1, repeatCount); i++) {
    setTimeout(() => sound.play(), i * step * 1000);
  }
}

/** Durée max acceptée pour un son personnalisé uploadé (19/09/2026, réglée à 5s par Krys). */
export const MAX_CUSTOM_SOUND_DURATION_SECONDS = 5;

/**
 * Son personnalisé uploadé par le Pro (19/09/2026, demande de Krys -- les
 * sons synthétisés ci-dessus sont jugés "trop basiques"). Contrairement aux
 * sons ci-dessus (Web Audio API, générés à la volée), celui-ci joue un vrai
 * fichier audio (MP3...) via un élément <audio> standard -- voir
 * uploadNotificationSound dans uploadsApi.ts pour l'upload lui-même.
 *
 * `play()` recrée un nouvel élément <audio> à chaque appel plutôt que de
 * réutiliser une instance partagée : nécessaire pour que les répétitions
 * rapprochées (voir playSoundRepeated) puissent se chevaucher sans qu'une
 * lecture n'interrompe la précédente.
 */
export function createCustomSound(url: string, label: string, durationSeconds: number): NotificationSound {
  return {
    id: "custom",
    label,
    durationSeconds,
    play: () => {
      const audio = new Audio(url);
      audio.play().catch(() => {});
    },
  };
}

/**
 * Mesure la durée d'un fichier audio local AVANT upload (via une URL
 * blob éphémère, révoquée juste après lecture des métadonnées) -- sert à
 * caler l'espacement des répétitions (voir playSoundRepeated /
 * GAP_BETWEEN_REPEATS). Repli à 1.5s si la métadonnée ne peut pas être lue
 * (fichier corrompu, format non supporté par le navigateur...).
 */
export function probeAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const audio = new Audio();
    const cleanup = () => URL.revokeObjectURL(objectUrl);
    audio.addEventListener("loadedmetadata", () => {
      resolve(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 1.5);
      cleanup();
    });
    audio.addEventListener("error", () => {
      resolve(1.5);
      cleanup();
    });
    audio.src = objectUrl;
  });
}
