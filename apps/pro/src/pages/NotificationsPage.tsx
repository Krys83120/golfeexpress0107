import React from "react";
import { Bell, Play, Printer } from "lucide-react";
import { NOTIFICATION_SOUNDS, getSoundById, playSoundRepeated } from "@/services/notificationSounds";
import { useNotificationSettingsStore } from "@/store/useNotificationSettingsStore";

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
          icon={<Bell size={18} className="text-nuit" />}
          title="Notifications sonores"
          description="Jouer un son quand une nouvelle commande arrive"
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
          onClick={() => playSoundRepeated(getSoundById(soundId), repeatCount)}
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
        </div>
      </div>
    </div>
  );
}
