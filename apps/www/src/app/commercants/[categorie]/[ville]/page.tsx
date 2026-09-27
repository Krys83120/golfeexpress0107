import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { buildMetadata, SITE_URL } from "@/lib/seo";
import {
  fetchPublicPros,
  fetchPublicServiceCities,
  buildProSlug,
  CATEGORY_LABELS,
  CATEGORY_LABELS_PLAIN,
  CATEGORY_SLUGS,
  resolveCategoryFromSlug,
} from "@/lib/publicApi";
import type { PublicPro, PublicServiceCity } from "@/lib/publicApi";

interface PageProps {
  params: { categorie: string; ville: string };
}

/**
 * SEO programmatique catégorie x ville (ex: /commercants/restaurant/sainte-maxime,
 * /commercants/boulangerie/grimaud) -- deuxième levier de la mission SEO/GEO
 * du 27/09/2026 (après /livraison/[ville]). Même principe que ce dossier :
 * UNE entrée statique par combinaison qui a RÉELLEMENT au moins un
 * commerçant correspondant aujourd'hui, jamais un produit cartésien
 * catégorie x ville généré aveuglément (voir /livraison/[ville]/page.tsx
 * pour la même consigne appliquée aux villes seules). Une combinaison sans
 * commerçant renvoie 404 plutôt qu'une page vide indexable.
 */
export async function generateStaticParams() {
  const [pros, cities] = await Promise.all([fetchPublicPros(), fetchPublicServiceCities()]);
  const indexableCities = cities.filter((c) => c.seoIndexable && c.seoSlug);

  const combos = new Set<string>();
  const params: { categorie: string; ville: string }[] = [];

  for (const pro of pros) {
    const proCity = pro.addresses?.[0]?.city;
    if (!proCity) continue;
    const city = indexableCities.find((c) => c.name.toLowerCase() === proCity.toLowerCase());
    if (!city || !city.seoSlug) continue;
    const categorieSlug = CATEGORY_SLUGS[pro.category];
    if (!categorieSlug) continue;

    const key = `${categorieSlug}/${city.seoSlug}`;
    if (combos.has(key)) continue;
    combos.add(key);
    params.push({ categorie: categorieSlug, ville: city.seoSlug });
  }

  return params;
}

async function findCityAndPros(
  categorieSlug: string,
  villeSlug: string
): Promise<{ city: PublicServiceCity; category: string; pros: PublicPro[] } | null> {
  const category = resolveCategoryFromSlug(categorieSlug);
  if (!category) return null;

  const cities = await fetchPublicServiceCities();
  const city = cities.find((c) => c.seoSlug === villeSlug && c.seoIndexable) ?? null;
  if (!city) return null;

  const pros = await fetchPublicPros();
  const matchingPros = pros.filter(
    (p) => p.category === category && p.addresses?.some((a) => a.city.toLowerCase() === city.name.toLowerCase())
  );
  if (matchingPros.length === 0) return null;

  return { city, category, pros: matchingPros };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const result = await findCityAndPros(params.categorie, params.ville);
  if (!result) return {};
  const { city, category } = result;
  const categoryLabel = CATEGORY_LABELS_PLAIN[category] ?? category;

  // Titre/description ciblent explicitement la requête "[catégorie]
  // [ville]" (ex: "restaurant Sainte-Maxime", "boulangerie Grimaud") --
  // voir mission SEO/GEO, tableau de mots-clés du 27/09/2026.
  const title = `${categoryLabel} à ${city.name} — Livraison | Do You Geckoo`;
  const description = `Livraison ${categoryLabel.toLowerCase()} à ${city.name} en 20 à 30 minutes avec Do You Geckoo. Découvrez les ${categoryLabel.toLowerCase()}s partenaires livrés à ${city.name} et commandez en ligne.`;

  return buildMetadata({ title, description, path: `/commercants/${CATEGORY_SLUGS[category]}/${city.seoSlug}` });
}

export default async function CategorieVillePage({ params }: PageProps) {
  const result = await findCityAndPros(params.categorie, params.ville);
  if (!result) notFound();
  const { city, category, pros } = result;
  const categoryLabel = CATEGORY_LABELS_PLAIN[category] ?? category;
  const categorieSlug = CATEGORY_SLUGS[category];
  const pageUrl = `${SITE_URL}/commercants/${categorieSlug}/${city.seoSlug}`;

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${pageUrl}#list`,
    name: `${categoryLabel} à ${city.name}`,
    itemListElement: pros.map((pro, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_URL}/commercants/${buildProSlug(pro)}`,
      name: pro.businessName,
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Commerçants", item: `${SITE_URL}/commercants` },
      { "@type": "ListItem", position: 3, name: city.name, item: `${SITE_URL}/livraison/${city.seoSlug}` },
      { "@type": "ListItem", position: 4, name: categoryLabel, item: pageUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Nav />
      <main className="bg-white">
        <div className="border-b border-gris-light bg-sable py-14 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <nav aria-label="Fil d'Ariane" className="mb-4 flex flex-wrap items-center justify-center gap-1.5 text-xs text-gris">
              <Link href="/commercants" className="hover:text-golfe-green hover:underline">
                Commerçants
              </Link>
              <span>/</span>
              <Link href={`/livraison/${city.seoSlug}`} className="hover:text-golfe-green hover:underline">
                {city.name}
              </Link>
              <span>/</span>
              <span className="font-semibold text-nuit">{categoryLabel}</span>
            </nav>
            <h1 className="font-heading text-3xl font-extrabold text-nuit sm:text-4xl">
              {categoryLabel} à {city.name}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-gris sm:text-base">
              Do You Geckoo livre les {categoryLabel.toLowerCase()}s partenaires de {city.name} en 20 à 30 minutes,
              avec des livreurs du Golfe de Saint-Tropez.
            </p>
            <a
              href="https://commander.doyougeckoo.fr"
              className="mt-8 inline-block rounded-full bg-corail px-8 py-3.5 text-sm font-bold text-white transition hover:bg-corail-light"
            >
              Commander maintenant →
            </a>
          </div>
        </div>

        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="mb-8 font-heading text-xl font-bold text-nuit">
              {pros.length} {categoryLabel.toLowerCase()}{pros.length > 1 ? "s" : ""} à {city.name}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pros.map((pro) => (
                <Link
                  key={pro.id}
                  href={`/commercants/${buildProSlug(pro)}`}
                  className="flex items-center gap-3 rounded-2xl border border-gris-light p-4 transition hover:border-golfe-green"
                >
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gris-light bg-white p-1.5">
                    {pro.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- logo dynamique par commerçant (URL Supabase Storage)
                      <img src={pro.logo} alt={pro.businessName} className="h-full w-full object-contain" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- asset statique local (public/), pas de bénéfice à next/image ici
                      <img src="/pro-fallback-badge.png" alt="Do You Geckoo" className="h-full w-full object-contain" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-corail">{CATEGORY_LABELS[category] ?? category}</p>
                    <p className="mt-1 font-heading text-base font-bold text-nuit">{pro.businessName}</p>
                    {pro.rating && pro.ratingCount > 0 && (
                      <p className="mt-0.5 text-xs text-gris">
                        ⭐ {Number(pro.rating).toFixed(1)} ({pro.ratingCount})
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
