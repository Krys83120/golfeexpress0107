import React, { useEffect, useState } from "react";
import { SettingsTable } from "../components/SettingsTable";
import { SettingEditModal } from "../components/SettingEditModal";
import { useAdminSettingsStore } from "@/store/useAdminSettingsStore";
import type { GlobalSettingRow } from "@/services/settingsApi";

export function AdminSettingsPage() {
  const settings = useAdminSettingsStore((s) => s.settings);
  const status = useAdminSettingsStore((s) => s.status);
  const error = useAdminSettingsStore((s) => s.error);
  const loadSettings = useAdminSettingsStore((s) => s.loadSettings);
  const updateSetting = useAdminSettingsStore((s) => s.updateSetting);
  const [editingSetting, setEditingSetting] = useState<GlobalSettingRow | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function handleSave(value: string) {
    if (!editingSetting) return;
    try {
      await updateSetting(editingSetting.key, value);
      setEditingSetting(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Impossible d'enregistrer ce paramètre.");
    }
  }

  return (
    <div className="flex-1 p-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold text-nuit">Paramètres globaux</h1>
        <p className="text-sm text-gris">
          Configuration de la plateforme — modèle <code className="rounded bg-gris-light px-1.5 py-0.5">GlobalSetting</code>
        </p>
      </div>

      {status === "error" && <div className="mb-6 rounded-sm bg-red-50 p-4 text-sm text-red-500">{error}</div>}
      {saveError && <div className="mb-6 rounded-sm bg-red-50 p-4 text-sm text-red-500">{saveError}</div>}

      {status === "loading" && settings.length === 0 ? (
        <p className="py-12 text-center text-sm text-gris">Chargement des paramètres...</p>
      ) : (
        <SettingsTable settings={settings} onEdit={setEditingSetting} />
      )}

      {editingSetting && (
        <SettingEditModal
          setting={editingSetting}
          onClose={() => {
            setEditingSetting(null);
            setSaveError(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
