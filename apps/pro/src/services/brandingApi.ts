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

/**
 * GET /api/settings/branding (public, pas d'auth requise) — met aussi à
 * jour le cache local. Lit `proLogoUrl`, distinct du logo des autres apps
 * depuis le 25/08/2026 (avant, un seul logo partagé s'affichait à
 * l'identique dans Admin/Pro/Commander/Livreur).
 */
export async function fetchBrandingLogoUrl(): Promise<string | null> {
  try {
    const data = await apiFetch<{ proLogoUrl: string | null }>("/api/settings/branding", { skipAuth: true });
    try {
      if (data.proLogoUrl) localStorage.setItem(CACHE_KEY, data.proLogoUrl);
      else localStorage.removeItem(CACHE_KEY);
    } catch {
      /* localStorage indisponible (navigation privée stricte, quota...) : sans conséquence */
    }
    return data.proLogoUrl;
  } catch {
    return null;
  }
}
