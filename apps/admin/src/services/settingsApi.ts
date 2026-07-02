import { apiFetch } from "@/services/apiClient";

export interface GlobalSettingRow {
  key: string;
  value: string;
  description: string;
}

interface RawGlobalSetting {
  key: string;
  value: unknown;
  description: string | null;
}

function toDisplayValue(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

/** GET /api/admin/settings */
export async function fetchGlobalSettings(): Promise<GlobalSettingRow[]> {
  const data = await apiFetch<{ settings: RawGlobalSetting[] }>("/api/admin/settings");
  return data.settings.map((s) => ({
    key: s.key,
    value: toDisplayValue(s.value),
    description: s.description ?? "",
  }));
}

/**
 * PATCH /api/admin/settings/[key]
 *
 * `value` est toujours envoyé tel quel (string) — côté API, GlobalSetting.value
 * est un champ Json qui accepte une string brute comme valeur JSON valide.
 * Si une valeur plus structurée est nécessaire (ex: liste de villes), il
 * faudra adapter ce point pour parser/sérialiser en JSON avant l'envoi.
 */
export async function updateGlobalSetting(key: string, value: string): Promise<GlobalSettingRow> {
  const data = await apiFetch<{ setting: RawGlobalSetting }>(`/api/admin/settings/${key}`, {
    method: "PATCH",
    body: { value },
  });
  return { key: data.setting.key, value: toDisplayValue(data.setting.value), description: data.setting.description ?? "" };
}
