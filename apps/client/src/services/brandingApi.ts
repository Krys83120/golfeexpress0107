import { apiFetch } from "@/services/apiClient";

/** GET /api/settings/branding (public, pas d'auth requise) */
export async function fetchBrandingLogoUrl(): Promise<string | null> {
  try {
    const data = await apiFetch<{ logoUrl: string | null }>("/api/settings/branding", { skipAuth: true });
    return data.logoUrl;
  } catch {
    return null;
  }
}
