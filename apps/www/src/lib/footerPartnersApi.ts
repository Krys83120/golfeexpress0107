const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export interface FooterPartner {
  id: string;
  name: string;
  url: string;
  logoUrl: string;
}

/**
 * GET /api/settings/footer-partners (public) -- partenaires affichés dans le
 * footer, gérés depuis Admin > Branding. Liste vide si rien n'est configuré
 * ou en cas d'erreur : le footer n'affiche alors tout simplement pas la section.
 */
export async function fetchFooterPartners(): Promise<FooterPartner[]> {
  try {
    const res = await fetch(`${API_URL}/api/settings/footer-partners`, { next: { revalidate: 10 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { partners?: FooterPartner[] };
    return data.partners ?? [];
  } catch {
    return [];
  }
}
