import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "@/services/apiClient";

const CACHE_KEY = "branding.logoUrl";

/**
 * Lit le logo mis en cache localement (instantané, pas d'attente réseau) —
 * évite le flash de l'emoji 🦎 par défaut le temps que l'appel API se
 * termine, sur toutes les visites après la toute première.
 */
export async function getCachedBrandingLogoUrl(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(CACHE_KEY);
  } catch {
    return null;
  }
}

/** GET /api/settings/branding (public, pas d'auth requise) — met aussi à jour le cache local. */
export async function fetchBrandingLogoUrl(): Promise<string | null> {
  try {
    const data = await apiFetch<{ logoUrl: string | null }>("/api/settings/branding", { skipAuth: true });
    if (data.logoUrl) {
      AsyncStorage.setItem(CACHE_KEY, data.logoUrl).catch(() => {});
    } else {
      AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
    }
    return data.logoUrl;
  } catch {
    return null;
  }
}
