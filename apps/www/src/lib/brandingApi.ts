const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

/**
 * GET /api/settings/branding (public, pas d'auth requise).
 * wwwLogoUrl est volontairement distinct du logo utilisé dans les 3 apps
 * (Client/Livreur/Pro) — gérable indépendamment depuis Admin > Branding.
 */
export async function fetchWwwLogoUrl(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/settings/branding`, { next: { revalidate: 10 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { wwwLogoUrl: string | null };
    return data.wwwLogoUrl;
  } catch {
    return null;
  }
}
