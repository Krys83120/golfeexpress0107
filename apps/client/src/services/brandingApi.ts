import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "@/services/apiClient";

const CACHE_KEY = "branding.logoUrl";
const SPLASH_CACHE_KEY = "branding.splashUrl";
const SPLASH_RUNNER_CACHE_KEY = "branding.splashRunnerUrl";

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

/**
 * GET /api/settings/branding (public, pas d'auth requise) — met aussi à
 * jour le cache local. Lit `commanderLogoUrl`, distinct du logo des autres
 * apps depuis le 25/08/2026 (avant, un seul logo partagé s'affichait à
 * l'identique dans Admin/Pro/Commander/Livreur).
 */
export async function fetchBrandingLogoUrl(): Promise<string | null> {
  try {
    const data = await apiFetch<{ commanderLogoUrl: string | null }>("/api/settings/branding", { skipAuth: true });
    if (data.commanderLogoUrl) {
      AsyncStorage.setItem(CACHE_KEY, data.commanderLogoUrl).catch(() => {});
    } else {
      AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
    }
    return data.commanderLogoUrl;
  } catch {
    return null;
  }
}

/**
 * Image de l'écran de chargement animé (SplashLoader), réglable en direct
 * depuis Admin > Branding (21/08/2026) — jusque-là une image statique
 * embarquée dans le build (`require`), impossible à changer sans
 * reconstruire/redéployer. Même mécanisme de cache que le logo : lue en
 * mémoire au tout premier affichage (peut être vide la toute première
 * fois), puis mise à jour pour les lancements suivants.
 */
export async function getCachedBrandingSplashUrl(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SPLASH_CACHE_KEY);
  } catch {
    return null;
  }
}

/** GET /api/settings/branding (public) — lit `commanderSplashUrl` et met à jour le cache local. */
export async function fetchBrandingSplashUrl(): Promise<string | null> {
  try {
    const data = await apiFetch<{ commanderSplashUrl: string | null }>("/api/settings/branding", { skipAuth: true });
    if (data.commanderSplashUrl) {
      AsyncStorage.setItem(SPLASH_CACHE_KEY, data.commanderSplashUrl).catch(() => {});
    } else {
      AsyncStorage.removeItem(SPLASH_CACHE_KEY).catch(() => {});
    }
    return data.commanderSplashUrl;
  } catch {
    return null;
  }
}

/**
 * Image de la mascotte qui TRAVERSE L'ÉCRAN (gauche → droite) une fois le
 * chargement terminé — réglable indépendamment du badge ci-dessus
 * (21/08/2026). Même mécanisme de cache que le badge.
 */
export async function getCachedBrandingSplashRunnerUrl(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SPLASH_RUNNER_CACHE_KEY);
  } catch {
    return null;
  }
}

/** GET /api/settings/branding (public) — lit `commanderSplashRunnerUrl` et met à jour le cache local. */
export async function fetchBrandingSplashRunnerUrl(): Promise<string | null> {
  try {
    const data = await apiFetch<{ commanderSplashRunnerUrl: string | null }>("/api/settings/branding", {
      skipAuth: true,
    });
    if (data.commanderSplashRunnerUrl) {
      AsyncStorage.setItem(SPLASH_RUNNER_CACHE_KEY, data.commanderSplashRunnerUrl).catch(() => {});
    } else {
      AsyncStorage.removeItem(SPLASH_RUNNER_CACHE_KEY).catch(() => {});
    }
    return data.commanderSplashRunnerUrl;
  } catch {
    return null;
  }
}
