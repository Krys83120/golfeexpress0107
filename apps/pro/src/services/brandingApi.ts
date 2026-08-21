import { apiFetch } from "@/services/apiClient";

const CACHE_KEY = "branding.logoUrl";
const SPLASH_CACHE_KEY = "branding.splashUrl";

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

/**
 * Image de l'écran de chargement animé (SplashLoader), réglable en direct
 * depuis Admin > Branding (21/08/2026) — jusque-là une image statique
 * figée dans public/, impossible à changer sans redéployer. Même
 * mécanisme de cache local que le logo, pour un affichage instantané dès
 * la 2e visite (pas d'attente réseau avant de montrer le badge).
 */
export function getCachedBrandingSplashUrl(): string | null {
  try {
    return localStorage.getItem(SPLASH_CACHE_KEY);
  } catch {
    return null;
  }
}

/** GET /api/settings/branding (public) — lit `proSplashUrl` et met à jour le cache local. */
export async function fetchBrandingSplashUrl(): Promise<string | null> {
  try {
    const data = await apiFetch<{ proSplashUrl: string | null }>("/api/settings/branding", { skipAuth: true });
    try {
      if (data.proSplashUrl) localStorage.setItem(SPLASH_CACHE_KEY, data.proSplashUrl);
      else localStorage.removeItem(SPLASH_CACHE_KEY);
    } catch {
      /* sans conséquence */
    }
    return data.proSplashUrl;
  } catch {
    return null;
  }
}
