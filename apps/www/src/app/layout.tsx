import type { Metadata } from "next";
import { Montserrat, Inter } from "next/font/google";
import "./globals.css";
import { SplashLoader } from "@/components/SplashLoader";
import { CookieConsent } from "@/components/CookieConsent";
import { ContactWidget } from "@/components/ContactWidget";
import { VerifiedReviewsBadge } from "@/components/VerifiedReviewsBadge";
import { VisitTracker } from "@/components/VisitTracker";
import { fetchWwwOgText } from "@/lib/brandingApi";
import { isSeoPublicLaunchEnabled } from "@/lib/seoSettings";

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
// Corrigé le 23/08/2026 (audit SEO/GEO) : l'ancien titre par défaut
// ("...en juste") était une phrase tronquée, jamais terminée.
const DEFAULT_OG_TITLE = "Do You Geckoo — La livraison locale du Golfe de Saint-Tropez";
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
  const [ogText, publicLaunch] = await Promise.all([fetchWwwOgText(), isSeoPublicLaunchEnabled()]);
  const ogTitle = ogText?.title || DEFAULT_OG_TITLE;
  const ogDescription = ogText?.description || DEFAULT_OG_DESCRIPTION;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      // Corrigé le 23/08/2026 (audit SEO/GEO) : title tronqué ("...en
      // juste") remplacé par une formulation complète et plus courte,
      // pensée pour la SERP plutôt que pour caser un maximum de villes.
      default: "Livraison Golfe de Saint-Tropez | Do You Geckoo",
      template: "%s | Do You Geckoo",
    },
    // Raccourcie et recentrée le 23/08/2026 : l'ancienne version (~200
    // caractères, au-delà du raisonnable pour une SERP) affirmait aussi
    // "jusqu'à 40% de plus [pour les livreurs] que sur les plateformes
    // classiques" sans aucune donnée dans le code pour l'étayer -- retiré
    // plutôt que laissé en l'état (voir lib/economics.ts pour la règle
    // suivie sur les chiffres comparatifs).
    description:
      "Commandez auprès des restaurants et commerces du Golfe de Saint-Tropez avec Do You Geckoo, la plateforme locale qui valorise commerces et livreurs.",
    keywords: [
      "livraison Sainte-Maxime",
      "livraison Saint-Tropez",
      "livraison Golfe de Saint-Tropez",
      "livraison locale",
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
    // Garde-fou pré-lancement (voir lib/seoSettings.ts + robots.ts) : tant
    // que seo.public_launch n'est pas activé depuis Admin > SEO/GEO, la
    // page se déclare elle-même non indexable, en plus du blocage robots.txt.
    robots: publicLaunch ? { index: true, follow: true } : { index: false, follow: false },
    alternates: { canonical: SITE_URL },
  };
}

// Organization / WebSite / Service séparés (au lieu d'un unique bloc
// LocalBusiness fusionné) et liés par @id -- structure recommandée par
// schema.org pour qu'un moteur IA puisse résoudre "qui édite ce site" et
// "quel service est proposé" comme deux entités distinctes mais reliées.
// sameAs reste vide tant qu'aucun compte social officiel n'est confirmé --
// jamais un lien inventé ou deviné.
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Do You Geckoo",
  url: SITE_URL,
  logo: `${SITE_URL}/icon.png`,
  description:
    "Plateforme de livraison locale connectant commerçants, clients et livreurs indépendants sur le Golfe de Saint-Tropez.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Sainte-Maxime",
    addressRegion: "Provence-Alpes-Côte d'Azur",
    addressCountry: "FR",
  },
  sameAs: [] as string[],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: "Do You Geckoo",
  inLanguage: "fr-FR",
  publisher: { "@id": `${SITE_URL}/#organization` },
};

// Sainte-Maxime : seule commune où le service est réellement actif
// aujourd'hui (voir modèle Prisma ServiceCity). "Golfe de Saint-Tropez" est
// gardé comme aire d'ambition déclarée (cohérent avec le contenu visible du
// site : "s'étend progressivement...", voir Faq.tsx) -- mais on ne liste
// PAS les autres communes individuellement ici tant qu'elles ne sont pas
// actives, pour ne jamais affirmer un service disponible là où il ne l'est pas.
const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Livraison locale de repas et commerces",
  provider: { "@id": `${SITE_URL}/#organization` },
  areaServed: [
    { "@type": "City", name: "Sainte-Maxime", containedInPlace: { "@type": "Place", name: "Golfe de Saint-Tropez" } },
    { "@type": "Place", name: "Golfe de Saint-Tropez" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${montserrat.variable} ${inter.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />
      </head>
      <body className="font-body bg-white text-nuit antialiased">
        <SplashLoader>{children}</SplashLoader>
        <CookieConsent />
        <ContactWidget />
        <VerifiedReviewsBadge />
        <VisitTracker />
      </body>
    </html>
  );
}
