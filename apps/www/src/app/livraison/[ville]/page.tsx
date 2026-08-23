import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { buildMetadata, SITE_URL } from "@/lib/seo";
import { fetchPublicServiceCities, fetchPublicPros, buildProSlug, CATEGORY_LABELS_PLAIN } from "@/lib/publicApi";
import type { PublicServiceCity } from "@/lib/publicApi";

interface PageProps {
  params: { ville: string };
}

/**
 * Une entrée statique PAR VILLE seoIndexable=true ET dotée d'un seoSlug --
 * jamais une génération automatique de toutes les communes du Golfe (voir
 * consigne explicite de la mission SEO/GEO : pas de page sans contenu réel
 * qui la justifie). Tant qu'aucune ville n'est configurée depuis
 * Admin > Zones & Capacité, ce dossier ne produit AUCUNE page.
 */
export async function generateStaticParams() {
  const cities = await fetchPublicServiceCities();
  return cities.filter((c) => c.seoIndexable && c.seoSlug).map((c) => ({ ville: c.seoSlug as string }));
}

async function findCity(slug: string): Promise<PublicServiceCity | null> {
  const cities = await fetchPublicServiceCities();
  return cities.find((c) => c.seoSlug === slug && c.seoIndexable) ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const city = await findCity(params.ville);
  if (!city) return {};

  // Le titre/la description ne prétendent JAMAIS que la livraison est déjà
  // active si isActive est encore false (voir consigne "ne jamais affirmer
  // une disponibilité qui n'est pas réelle") -- formulation différenciée
  // selon l'état réel de la ville.
  const title = city.isActive
    ? `Livraison à ${city.name} | Golfe de Saint-Tropez`
    : `Livraison à ${city.name} — bientôt disponible`;
  const description = city.isActive
    ? `Commandez auprès des commerçants et restaurants de ${city.name} avec Do You Geckoo, livré en 20 à 30 minutes par des livreurs locaux.`
    : `Do You Geckoo prépare son arrivée à ${city.name}, dans le Golfe de Saint-Tropez. Découvrez notre service déjà actif à Sainte-Maxime en attendant.`;

  return buildMetadata({ title, description, path: `/livraison/${city.seoSlug}` });
}

export default async function VillePage({ params }: PageProps) {
  const city = await findCity(params.ville);
  if (!city) notFound();

  const pros = await fetchPublicPros();
  const cityPros = pros.filter((p) => p.addresses?.some((a) => a.city.toLowerCase() === city.name.toLowerCase()));

  const pageUrl = `${SITE_URL}/livraison/${city.seoSlug}`;

  // Service scopé à CETTE ville uniquement -- distinct du Service générique
  // du layout racine (areaServed Sainte-Maxime + Golfe). areaServed reflète
  // ici littéralement le nom de la ville de la page, jamais une liste plus
  // large qui laisserait entendre une couverture non réelle.
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${pageUrl}#service`,
    serviceType: "Livraison locale de repas et commerces",
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: { "@type": "City", name: city.name },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Livraison", item: `${SITE_URL}/livraison` },
      { "@type": "ListItem", position: 3, name: city.name, item: pageUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Nav />
      <main className="bg-white">
        <div className="border-b border-gris-light bg-sable py-14 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            {!city.isActive && (
              <p className="mx-auto mb-4 inline-block rounded-full bg-golfe-green/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-golfe-green">
                Bientôt disponible
              </p>
            )}
            <h1 className="font-heading text-3xl font-extrabold text-nuit sm:text-4xl">
              {city.isActive ? `Livraison à ${city.name}` : `Do You Geckoo arrive bientôt à ${city.name}`}
            </h1>
            {city.seoIntro && <p className="mx-auto mt-4 max-w-2xl text-sm text-gris sm:text-base">{city.seoIntro}</p>}
            {city.isActive ? (
              <a
                href="https://commander.doyougeckoo.fr"
                className="mt-8 inline-block rounded-full bg-corail px-8 py-3.5 text-sm font-bold text-white transition hover:bg-corail-light"
              >
                Commander maintenant →
              </a>
            ) : (
              <Link
                href="/commercants"
                className="mt-8 inline-block rounded-full bg-nuit px-8 py-3.5 text-sm font-bold text-white transition hover:bg-nuit-light"
              >
                Voir les commerçants déjà livrés →
              </Link>
            )}
          </div>
        </div>

        {city.isActive && (
          <section className="py-14 sm:py-20">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <h2 className="mb-8 font-heading text-xl font-bold text-nuit">
                {cityPros.length > 0 ? `Commerçants livrés à ${city.name}` : `Bientôt des commerçants à ${city.name}`}
              </h2>
              {cityPros.length === 0 ? (
                <p className="text-sm text-gris">
                  Aucun commerçant partenaire n'est encore référencé à {city.name} — revenez bientôt, ou{" "}
                  <Link href="/devenir-partenaire#commercants" className="font-semibold text-golfe-green hover:underline">
                    inscrivez votre commerce
                  </Link>
                  .
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {cityPros.map((pro) => (
                    <Link
                      key={pro.id}
                      href={`/commercants/${buildProSlug(pro)}`}
                      className="rounded-2xl border border-gris-light p-4 transition hover:border-golfe-green"
                    >
                      <p className="text-xs font-semibold text-corail">
                        {CATEGORY_LABELS_PLAIN[pro.category] ?? pro.category}
                      </p>
                      <p className="mt-1 font-heading text-base font-bold text-nuit">{pro.businessName}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
