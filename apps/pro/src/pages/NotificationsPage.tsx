import React, { useRef, useState } from "react";
import { Bell, BellRing, Play, Printer, Upload, X } from "lucide-react";
import {
  NOTIFICATION_SOUNDS,
  getSoundById,
  playSoundRepeated,
  createCustomSound,
  probeAudioDuration,
  MAX_CUSTOM_SOUND_DURATION_SECONDS,
} from "@/services/notificationSounds";
import { useNotificationSettingsStore } from "@/store/useNotificationSettingsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { uploadNotificationSound } from "@/services/uploadsApi";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { sendTestPush } from "@/services/pushNotificationsApi";

const REPEAT_OPTIONS = [
  { value: 1, label: "Court (x1)" },
  { value: 2, label: "Moyen (x2)" },
  { value: 3, label: "Long (x3)" },
  { value: 5, label: "Très long (x5)" },
];

function ToggleRow({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gris-light">{icon}</div>
        <div>
          <p className="text-sm font-semibold text-nuit">{title}</p>
          <p className="text-xs text-gris">{description}</p>
        </div>
      </div>
      <label className="relative inline-flex cursor-pointer items-center">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <div className="peer h-6 w-11 rounded-full bg-gris-light after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-golfe-green peer-checked:after:translate-x-full peer-focus:outline-none" />
      </label>
    </div>
  );
}

export function NotificationsPage() {
  const soundId = useNotificationSettingsStore((s) => s.soundId);
  const enabled = useNotificationSettingsStore((s) => s.enabled);
  const repeatCount = useNotificationSettingsStore((s) => s.repeatCount);
  const autoPrint = useNotificationSettingsStore((s) => s.autoPrint);
  const setSoundId = useNotificationSettingsStore((s) => s.setSoundId);
  const setEnabled = useNotificationSettingsStore((s) => s.setEnabled);
  const setRepeatCount = useNotificationSettingsStore((s) => s.setRepeatCount);
  const setAutoPrint = useNotificationSettingsStore((s) => s.setAutoPrint);
  const customSoundUrl = useNotificationSettingsStore((s) => s.customSoundUrl);
  const customSoundLabel = useNotificationSettingsStore((s) => s.customSoundLabel);
  const customSoundDuration = useNotificationSettingsStore((s) => s.customSoundDuration);
  const setCustomSound = useNotificationSettingsStore((s) => s.setCustomSound);
  const clearCustomSound = useNotificationSettingsStore((s) => s.clearCustomSound);

  const proId = useAuthStore((s) => s.profile?.id);
  const soundInputRef = useRef<HTMLInputElement>(null);
  const [uploadingSound, setUploadingSound] = useState(false);
  const [soundUploadError, setSoundUploadError] = useState<string | null>(null);

  // Notifications même appli fermée (ajout du 22/09/2026, demande de Krys)
  // -- voir hooks/usePushNotifications.ts. Distinct du réglage "Notifications
  // sonores" ci-dessous : celui-ci ne joue que quand l'appli est déjà
  // ouverte, alors que le push marche appli complètement fermée.
  const pushNotifications = usePushNotifications();
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  // Bouton "Tester" (22/09/2026, suite au signalement de Krys : toggle
  // activé mais rien reçu appli fermée) -- envoie une vraie notification de
  // test au lieu d'attendre une vraie commande, et affiche un diagnostic
  // précis (abonnement bien enregistré côté serveur ? config VAPID
  // présente ?) pour savoir où ça bloque sans deviner. Voir sendTestPush /
  // PATCH /api/pros/push-subscription.
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  async function handleTestPush() {
    setTestSending(true);
    setTestResult(null);
    try {
      const { subscriptionCount, vapidConfigured } = await sendTestPush();
      if (subscriptionCount === 0) {
        setTestResult(
          "⚠️ Aucun abonnement enregistré côté serveur pour cet appareil — l'activation n'a pas fonctionné. Désactive puis réactive le toggle ci-dessus."
        );
      } else if (!vapidConfigured) {
        setTestResult("⚠️ Configuration serveur manquante — contacte le support technique.");
      } else {
        setTestResult(
          `✅ Notification de test envoyée à ${subscriptionCount} appareil${subscriptionCount > 1 ? "s" : ""} abonné${subscriptionCount > 1 ? "s" : ""}. Tu dois la recevoir dans quelques secondes — si rien n'arrive, le souci vient des réglages de notifications de ton téléphone/navigateur pour ce site, pas de l'appli.`
        );
      }
    } catch (err) {
      setTestResult(err instanceof Error ? `⚠️ ${err.message}` : "⚠️ Échec de l'envoi du test.");
    } finally {
      setTestSending(false);
    }
  }

  async function handleTogglePush(next: boolean) {
    if (pushLoading) return;
    if (next && pushNotifications.state === "unsupported") return;
    setPushError(null);
    setPushLoading(true);
    try {
      if (next) {
        const ok = await pushNotifications.enable();
        if (!ok) {
          setPushError(
            pushNotifications.state === "denied"
              ? "Notifications bloquées pour ce navigateur — vérifiez les réglages de notifications de votre téléphone/navigateur pour doyougeckoo.fr."
              : "Impossible d'activer les notifications sur cet appareil pour le moment."
          );
        }
      } else {
        await pushNotifications.disable();
      }
    } finally {
      setPushLoading(false);
    }
  }

  /**
   * Upload d'un son personnalisé (19/09/2026, demande de Krys) : mesure
   * d'abord la durée en local (probeAudioDuration, avant tout upload réseau)
   * puis upload vers Supabase Storage -- voir uploadNotificationSound.
   * Sélectionné automatiquement dès l'upload terminé (voir setCustomSound).
   */
  async function handleSoundFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!proId) {
      setSoundUploadError("Profil commerçant introuvable.");
      return;
    }
    setSoundUploadError(null);
    setUploadingSound(true);
    try {
      const duration = await probeAudioDuration(file);
      if (duration > MAX_CUSTOM_SOUND_DURATION_SECONDS) {
        setSoundUploadError(
          `Ce fichier dure ${duration.toFixed(1)}s — ${MAX_CUSTOM_SOUND_DURATION_SECONDS} secondes maximum pour une sonnerie.`
        );
        return;
      }
      const url = await uploadNotificationSound(proId, file);
      setCustomSound(url, file.name, duration);
    } catch (err) {
      setSoundUploadError(err instanceof Error ? err.message : "Échec de l'upload.");
    } finally {
      setUploadingSound(false);
      if (soundInputRef.current) soundInputRef.current.value = "";
    }
  }

  /** Rejoue le son actuellement sélectionné (personnalisé ou intégré), pour le bouton "Tester la durée complète" ci-dessous. */
  function playCurrentSelection(count: number) {
    if (soundId === "custom" && customSoundUrl) {
      playSoundRepeated(createCustomSound(customSoundUrl, customSoundLabel ?? "Son personnalisé", customSoundDuration), count);
      return;
    }
    playSoundRepeated(getSoundById(soundId), count);
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold text-nuit">Notifications</h1>
        <p className="text-sm text-gris">
          Ces réglages sont propres à cet appareil (tablette/ordinateur) — vous pouvez configurer chaque appareil
          utilisé en boutique différemment.
        </p>
      </div>

      <div className="mb-4">
        <ToggleRow
          icon={<BellRing size={18} className="text-nuit" />}
          title="Notifications même appli fermée"
          description={
            pushNotifications.state === "unsupported"
              ? "Non disponible sur cet appareil/navigateur"
              : pushNotifications.state === "denied"
              ? "Bloquées pour ce navigateur — à réactiver dans ses réglages de notifications"
              : "Être alerté(e) d'une nouvelle commande même quand l'appli n'est pas ouverte"
          }
          checked={pushNotifications.state === "granted"}
          onChange={handleTogglePush}
        />
        {pushLoading && <p className="mt-1.5 text-xs text-gris">Mise à jour...</p>}
        {pushError && <p className="mt-1.5 text-xs text-red-500">{pushError}</p>}

        {pushNotifications.state === "granted" && (
          <div className="mt-2">
            <button
              type="button"
              onClick={handleTestPush}
              disabled={testSending}
              className="flex items-center gap-1.5 rounded-full border border-gris-light bg-white px-4 py-2 text-xs font-semibold text-nuit shadow-sm hover:bg-gris-light disabled:opacity-60"
            >
              <Play size={12} /> {testSending ? "Envoi..." : "Tester la notification"}
            </button>
            {testResult && <p className="mt-1.5 text-xs text-nuit">{testResult}</p>}
          </div>
        )}
      </div>

      <div className="mb-4">
        <ToggleRow
          icon={<Bell size={18} className="text-nuit" />}
          title="Notifications sonores"
          description="Jouer un son quand une nouvelle commande arrive (appli déjà ouverte)"
          checked={enabled}
          onChange={setEnabled}
        />
      </div>

      <div className="mb-4">
        <ToggleRow
          icon={<Printer size={18} className="text-nuit" />}
          title="Impression automatique"
          description="Imprimer directement l'étiquette dès qu'une nouvelle commande arrive, sans action manuelle"
          checked={autoPrint}
          onChange={setAutoPrint}
        />
      </div>

      <div className="mb-4 rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <h3 className="mb-1 font-heading text-base font-bold text-nuit">⏱️ Durée de l'alerte</h3>
        <p className="mb-4 text-xs text-gris">
          Le son se répète le nombre de fois choisi — utile si le son par défaut est trop court pour être entendu
          depuis la cuisine ou l'arrière-boutique.
        </p>
        <div className="flex flex-wrap gap-2">
          {REPEAT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRepeatCount(option.value)}
              className="rounded-full px-4 py-2 text-sm font-semibold transition-colors"
              style={{
                backgroundColor: repeatCount === option.value ? "#2ECC71" : "#F3F4F6",
                color: repeatCount === option.value ? "white" : "#1A1A2E",
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => playCurrentSelection(repeatCount)}
          className="mt-4 flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-nuit shadow-sm hover:bg-gris-light"
          style={{ border: "1px solid #F3F4F6" }}
        >
          <Play size={12} /> Tester la durée complète
        </button>
      </div>

      <div className="rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <h3 className="mb-4 font-heading text-base font-bold text-nuit">🔊 Choisir un son</h3>
        <div className="flex flex-col gap-2">
          {NOTIFICATION_SOUNDS.map((sound) => (
            <div
              key={sound.id}
              onClick={() => setSoundId(sound.id)}
              className="flex cursor-pointer items-center justify-between rounded-sm border p-3.5 transition-colors"
              style={{
                borderColor: soundId === sound.id ? "#2ECC71" : "#F3F4F6",
                backgroundColor: soundId === sound.id ? "#E8F5E9" : "white",
              }}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  checked={soundId === sound.id}
                  onChange={() => setSoundId(sound.id)}
                  className="h-4 w-4 accent-golfe-green"
                />
                <span className="text-sm font-medium text-nuit">{sound.label}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  sound.play();
                }}
                className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-nuit shadow-sm hover:bg-gris-light"
              >
                <Play size={12} /> Écouter
              </button>
            </div>
          ))}

          {customSoundUrl && (
            <div
              onClick={() => setSoundId("custom")}
              className="flex cursor-pointer items-center justify-between rounded-sm border p-3.5 transition-colors"
              style={{
                borderColor: soundId === "custom" ? "#2ECC71" : "#F3F4F6",
                backgroundColor: soundId === "custom" ? "#E8F5E9" : "white",
              }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <input
                  type="radio"
                  checked={soundId === "custom"}
                  onChange={() => setSoundId("custom")}
                  className="h-4 w-4 shrink-0 accent-golfe-green"
                />
                <span className="truncate text-sm font-medium text-nuit">🎵 {customSoundLabel ?? "Son personnalisé"}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    createCustomSound(customSoundUrl, customSoundLabel ?? "Son personnalisé", customSoundDuration).play();
                  }}
                  className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-nuit shadow-sm hover:bg-gris-light"
                >
                  <Play size={12} /> Écouter
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearCustomSound();
                  }}
                  title="Supprimer ce son personnalisé"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-gris hover:bg-red-50 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-gris-light pt-4">
          <input
            ref={soundInputRef}
            type="file"
            accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/aac,.mp3,.wav,.m4a,.aac"
            onChange={handleSoundFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => soundInputRef.current?.click()}
            disabled={uploadingSound}
            className="flex items-center gap-1.5 rounded-full border border-gris-light bg-white px-4 py-2 text-xs font-semibold text-nuit hover:bg-gris-light"
            style={{ opacity: uploadingSound ? 0.6 : 1 }}
          >
            <Upload size={12} />
            {uploadingSound ? "Envoi..." : customSoundUrl ? "Remplacer le son personnalisé" : "Ajouter un son personnalisé (MP3)"}
          </button>
          <p className="mt-1.5 text-[11px] text-gris">
            MP3, WAV, M4A ou AAC — 2 Mo maximum, {MAX_CUSTOM_SOUND_DURATION_SECONDS} secondes maximum.
          </p>
          {soundUploadError && <p className="mt-1.5 text-xs text-red-500">{soundUploadError}</p>}
        </div>
      </div>
    </div>
  );
}
