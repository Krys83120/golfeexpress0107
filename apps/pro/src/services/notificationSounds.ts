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

export const NOTIFICATION_SOUNDS: NotificationSound[] = [
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
const GAP_BETWEEN_REPEATS = 0.35;

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
