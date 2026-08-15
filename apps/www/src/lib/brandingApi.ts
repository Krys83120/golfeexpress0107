const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

/** GET /api/settings/branding (public, pas d'auth requise). */
export async function fetchBrandingLogoUrl(): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/settings/branding`, { next: { revalidate: 10 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { logoUrl: string | null };
    return data.logoUrl;
  } catch {
    return null;
  }
}
