import type { Metadata } from "next";
import { Montserrat, Inter } from "next/font/google";
import "./globals.css";
import { SplashLoader } from "@/components/SplashLoader";
import { CookieConsent } from "@/components/CookieConsent";
import { ContactWidget } from "@/components/ContactWidget";
import { VerifiedReviewsBadge } from "@/components/VerifiedReviewsBadge";
import { fetchWwwOgText } from "@/lib/brandingApi";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_URL = "https://www.doyougeckoo.fr";

// Valeurs par défaut de l'aperçu de partage (WhatsApp/iMessage/Facebook...)
// — utilisées tant que rien n'a été configuré depuis Admin > SEO/GEO.
const DEFAULT_OG_TITLE = "Do You Geckoo — La livraison locale du Golfe de Saint-Tropez, en juste";
const DEFAULT_OG_DESCRIPTION =
  "Livraison de vos commerces préférés en 20-30 minutes. Des livreurs mieux payés, des commerçants moins taxés, un service 100% local.";

// Image d'aperçu de partage : chemin STABLE dans le bucket Supabase
// "branding-assets" (og-www.png), le même mécanisme que les 3 apps
// (Commander/Livreur/Pro) — régénérable depuis Admin > SEO/GEO sans jamais
// avoir besoin de redéployer le site vitrine. Repli sur un fichier statique
// local si la variable d'env n'est pas encore configurée sur Vercel.
const OG_IMAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/branding-assets/og-www.png`
  : `${SITE_URL}/og-image.png`;

/**
 * generateMetadata (au lieu d'un simple `export const metadata` figé au
 * build) pour pouvoir relire le titre/description d'aperçu de partage
 * configurés depuis Admin > SEO/GEO à chaque requête (avec un court cache
 * de 10s côté fetch) — une mise à jour depuis l'Admin se propage donc sans
 * redéploiement, exactement comme pour l'image.
 */
export async function generateMetadata(): Promise<Metadata> {
  const ogText = await fetchWwwOgText();
  const ogTitle = ogText?.title || DEFAULT_OG_TITLE;
  const ogDescription = ogText?.description || DEFAULT_OG_DESCRIPTION;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: "Do You Geckoo — La livraison locale du Golfe de Saint-Tropez, en juste",
      template: "%s | Do You Geckoo",
    },
    description:
      "Do You Geckoo livre les commerces de Sainte-Maxime et du Golfe de Saint-Tropez en 20-30 minutes. Nos livreurs gagnent jusqu'à 40% de plus que sur les plateformes classiques, pour le même prix client.",
    keywords: [
      "livraison Sainte-Maxime",
      "livraison Golfe de Saint-Tropez",
      "livraison locale",
      "alternative Uber Eats",
      "devenir livreur Sainte-Maxime",
      "commerçants livraison Var",
    ],
    authors: [{ name: "Do You Geckoo" }],
    openGraph: {
      type: "website",
      locale: "fr_FR",
      url: SITE_URL,
      siteName: "Do You Geckoo",
      title: ogTitle,
      description: ogDescription,
      images: [{ url: OG_IMAGE_URL, width: 1200, height: 630, alt: "Do You Geckoo" }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [OG_IMAGE_URL],
    },
    robots: { index: true, follow: true },
    alternates: { canonical: SITE_URL },
  };
}

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Do You Geckoo",
  description:
    "Plateforme de livraison locale connectant commerçants, clients et livreurs indépendants sur le Golfe de Saint-Tropez.",
  url: SITE_URL,
  areaServed: {
    "@type": "Place",
    name: "Golfe de Saint-Tropez",
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Sainte-Maxime",
    addressRegion: "Provence-Alpes-Côte d'Azur",
    addressCountry: "FR",
  },
  sameAs: [] as string[],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${montserrat.variable} ${inter.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className="font-body bg-white text-nuit antialiased">
        <SplashLoader>{children}</SplashLoader>
        <CookieConsent />
        <ContactWidget />
        <VerifiedReviewsBadge />
      </body>
    </html>
  );
}
