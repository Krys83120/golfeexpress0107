import { apiFetch } from "@/services/apiClient";

const CACHE_KEY = "branding.logoUrl";

/** Lit le logo mis en cache localement — évite le flash de l'emoji 🦎 par défaut. */
export function getCachedBrandingLogoUrl(): string | null {
  try {
    return localStorage.getItem(CACHE_KEY);
  } catch {
    return null;
  }
}

/** GET /api/settings/branding (public, pas d'auth requise) — met aussi à jour le cache local. */
export async function fetchBrandingLogoUrl(): Promise<string | null> {
  try {
    const data = await apiFetch<{ logoUrl: string | null }>("/api/settings/branding", { skipAuth: true });
    try {
      if (data.logoUrl) localStorage.setItem(CACHE_KEY, data.logoUrl);
      else localStorage.removeItem(CACHE_KEY);
    } catch {
      /* localStorage indisponible (navigation privée stricte, quota...) : sans conséquence */
    }
    return data.logoUrl;
  } catch {
    return null;
  }
}
