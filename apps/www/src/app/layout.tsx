import type { Metadata } from "next";
import { Montserrat, Inter } from "next/font/google";
import "./globals.css";

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

const SITE_URL = "https://www.golfeexpress.fr";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "GolfeExpress — La livraison locale du Golfe de Saint-Tropez, en juste",
    template: "%s | GolfeExpress",
  },
  description:
    "GolfeExpress livre les commerces de Sainte-Maxime et du Golfe de Saint-Tropez en 20-30 minutes. Nos livreurs gagnent jusqu'à 40% de plus que sur les plateformes classiques, pour le même prix client.",
  keywords: [
    "livraison Sainte-Maxime",
    "livraison Golfe de Saint-Tropez",
    "livraison locale",
    "alternative Uber Eats",
    "devenir livreur Sainte-Maxime",
    "commerçants livraison Var",
  ],
  authors: [{ name: "GolfeExpress" }],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: "GolfeExpress",
    title: "GolfeExpress — La livraison locale du Golfe de Saint-Tropez, en juste",
    description:
      "Livraison de vos commerces préférés en 20-30 minutes. Des livreurs mieux payés, des commerçants moins taxés, un service 100% local.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "GolfeExpress" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GolfeExpress — La livraison locale du Golfe de Saint-Tropez",
    description: "Des livreurs mieux payés, des commerçants moins taxés. Livraison en 20-30 min à Sainte-Maxime et sur tout le Golfe.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE_URL },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "GolfeExpress",
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
      <body className="font-body bg-white text-nuit antialiased">{children}</body>
    </html>
  );
}
