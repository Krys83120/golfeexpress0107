import React from "react";
import type { GlobalSettingRow } from "@/services/settingsApi";

interface SettingsTableProps {
  settings: GlobalSettingRow[];
  onEdit?: (setting: GlobalSettingRow) => void;
}

export function SettingsTable({ settings, onEdit }: SettingsTableProps) {
  return (
    <div className="rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-heading text-base font-bold text-nuit">⚙️ Paramètres globaux</h3>
        <span className="text-xs text-gris">Modèle GlobalSetting</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gris-light text-xs uppercase tracking-wide text-gris">
              <th className="py-2 pr-4 font-medium">Clé</th>
              <th className="py-2 pr-4 font-medium">Valeur par défaut</th>
              <th className="py-2 pr-4 font-medium">Description</th>
              <th className="py-2 pr-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {settings.map((setting) => (
              <tr key={setting.key} className="border-b border-gris-light last:border-0">
                <td className="py-3 pr-4">
                  <code className="rounded bg-gris-light px-2 py-1 text-xs text-nuit">{setting.key}</code>
                </td>
                <td className="py-3 pr-4">
                  <code className="rounded bg-gris-light px-2 py-1 text-xs font-semibold text-golfe-green">
                    {setting.value}
                  </code>
                </td>
                <td className="py-3 pr-4 text-sm text-gris">{setting.description}</td>
                <td className="py-3 pr-4">
                  <button
                    onClick={() => onEdit?.(setting)}
                    className="text-sm font-semibold text-golfe-green hover:underline"
                  >
                    Modifier
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
