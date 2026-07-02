import React, { useState } from "react";
import { X } from "lucide-react";
import type { GlobalSettingRow } from "@/services/settingsApi";

interface SettingEditModalProps {
  setting: GlobalSettingRow;
  onClose: () => void;
  onSave: (value: string) => void;
}

export function SettingEditModal({ setting, onClose, onSave }: SettingEditModalProps) {
  const [value, setValue] = useState(setting.value);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(value);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-nuit">Modifier le paramètre</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-gris-light">
            <X size={18} />
          </button>
        </div>

        <div className="mb-4">
          <code className="rounded bg-gris-light px-2 py-1 text-xs text-nuit">{setting.key}</code>
          <p className="mt-2 text-sm text-gris">{setting.description}</p>
        </div>

        <label className="mb-1 block text-xs font-semibold text-gris">Nouvelle valeur</label>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-sm border border-gris-light px-3 py-2 font-mono text-sm"
          autoFocus
        />

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-gris-light px-4 py-2 text-sm font-semibold text-gris"
          >
            Annuler
          </button>
          <button type="submit" className="rounded-sm bg-golfe-green px-5 py-2 text-sm font-semibold text-white">
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
