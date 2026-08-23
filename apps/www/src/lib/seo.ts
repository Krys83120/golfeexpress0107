import type { Metadata } from "next";

export const SITE_URL = "https://www.doyougeckoo.fr";
export const SITE_NAME = "Do You Geckoo";

const DEFAULT_OG_IMAGE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/branding-assets/og-www.png`
  : `${SITE_URL}/og-image.png`;

export interface SeoInput {
  /** Sans le suffixe " | Do You Geckoo" -- ajouté automatiquement via le template du layout racine. */
  title: string;
  description: string;
  /** Chemin relatif (ex: "/livraison/sainte-maxime") ou URL absolue. */
  path?: string;
  image?: string;
  /** false uniquement pour une page volontairement non indexable (ex: ville pas encore active). */
  indexable?: boolean;
}

/**
 * Point d'entrée UNIQUE pour construire les metadata Next.js d'une page --
 * remplace la duplication manuelle de title/description/OG/Twitter/canonical
 * qui existait page par page. Chaque nouvelle page doit passer par ici
 * plutôt que reconstruire son propre objet Metadata à la main.
 *
 * Ne gère PAS le robots global (indexation publique pré-lancement) : ça
 * reste piloté par generateMetadata() du layout racine + robots.ts via le
 * réglage seo.public_launch (voir lib/seoSettings.ts) -- une page ne peut
 * donc pas s'auto-indexer avant le lancement même en passant indexable:true
 * ici, mais peut se retirer elle-même (ex: ville pas encore active) via
 * indexable:false.
 */
export function buildMetadata(input: SeoInput): Metadata {
  const url = input.path
    ? input.path.startsWith("http")
      ? input.path
      : `${SITE_URL}${input.path}`
    : SITE_URL;
  const image = input.image ?? DEFAULT_OG_IMAGE;

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "fr_FR",
      url,
      siteName: SITE_NAME,
      title: input.title,
      description: input.description,
      images: [{ url: image, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [image],
    },
    ...(input.indexable === false ? { robots: { index: false, follow: true } } : {}),
  };
}
