import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { buildMetadata, SITE_URL } from "@/lib/seo";
import {
  fetchPublicServiceCities,
  fetchPublicPros,
  fetchPublicProspects,
  buildProSlug,
  CATEGORY_LABELS_PLAIN,
} from "@/lib/publicApi";
import type { PublicServiceCity, PublicPro, PublicProspect } from "@/lib/publicApi";

interface PageProps {
  params: { ville: string };
}

/**
 * Page "annuaire" /decouvrir/[ville] -- troisième page ville du site après
 * /livraison/[ville] (partenaires actifs uniquement) et
 * /commercants/[categorie]/[ville] (partenaires par catégorie). Ajout du
 * 30/09/2026, demande de Krys : exploiter sa liste Admin > Prospection
 * pour du contenu SEO local, sans jamais laisser croire qu'un commerce
 * non partenaire livre via Do You Geckoo.
 *
 * Différence de fond avec /livraison/[ville] : cette page mélange
 * VOLONTAIREMENT deux listes bien distinguées visuellement --
 * 1) les vrais partenaires (mêmes données que /livraison/[ville], lien
 *    vers leur fiche /commercants/[slug], bouton actif),
 * 2) les prospects (PublicProspect, voir publicApi.ts) : badge neutre
 *    "Pas encore partenaire", lien externe vers LEUR site/fiche
 *    Google/Facebook, jamais de bouton "Commander", jamais de lien
 *    interne vers une fiche qui n'existe pas.
 * Sert un double objectif : du contenu local réellement utile même avant
 * l'arrivée de DYG dans une catégorie/ville donnée, et un outil de
 * prospection commerciale (Krys peut montrer au commerçant "ta page
 * existe déjà, active-la" -- voir CTA devenir-partenaire en bas).
 *
 * generateStaticParams : une page PAR ville seoIndexable ET dotée d'au
 * moins un prospect qualifié (même filtre que GET /api/prospects) --
 * jamais une ville sans aucun contenu réel à afficher, même logique que
 * /livraison/[ville] et /commercants/[categorie]/[ville].
 */
export async function generateStaticParams() {
  const [cities, prospects] = await Promise.all([fetchPublicServiceCities(), fetchPublicProspects()]);
  const indexableCities = cities.filter((c) => c.seoIndexable && c.seoSlug);
  return indexableCities
    .filter((c) => prospects.some((p) => p.city.toLowerCase() === c.name.toLowerCase()))
    .map((c) => ({ ville: c.seoSlug as string }));
}

async function findCity(slug: string): Promise<PublicServiceCity | null> {
  const cities = await fetchPublicServiceCities();
  return cities.find((c) => c.seoSlug === slug && c.seoIndexable) ?? null;
}

function groupByCategory<T extends { category: string }>(items: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
  return [...groups.entries()].sort((a, b) =>
    (CATEGORY_LABELS_PLAIN[a[0]] ?? a[0]).localeCompare(CATEGORY_LABELS_PLAIN[b[0]] ?? b[0])
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const city = await findCity(params.ville);
  if (!city) return {};
  const title = `Restaurants et commerces à ${city.name} | Do You Geckoo`;
  const description = `L'annuaire des restaurants, commerces et professionnels de ${city.name} proposant la vente à emporter ou la livraison, référencés par Do You Geckoo dans le Golfe de Saint-Tropez.`;
  return buildMetadata({ title, description, path: `/decouvrir/${city.seoSlug}` });
}

export default async function DecouvrirVillePage({ params }: PageProps) {
  const city = await findCity(params.ville);
  if (!city) notFound();

  const [pros, prospects] = await Promise.all([fetchPublicPros(), fetchPublicProspects()]);
  const cityPros = pros.filter((p) => p.addresses?.some((a) => a.city.toLowerCase() === city.name.toLowerCase()));
  const cityProspects = prospects.filter((p) => p.city.toLowerCase() === city.name.toLowerCase());

  // Filet de sécurité en plus de generateStaticParams -- une requête
  // directe sur une combinaison sans aucun contenu (partenaire OU
  // prospect) renvoie 404 plutôt qu'une page vide.
  if (cityPros.length === 0 && cityProspects.length === 0) notFound();

  const pageUrl = `${SITE_URL}/decouvrir/${city.seoSlug}`;
  const prosByCategory = groupByCategory(cityPros);
  const prospectsByCategory = groupByCategory(cityProspects);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: city.name, item: pageUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Nav />
      <main className="bg-white">
        <div className="border-b border-gris-light bg-sable py-14 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h1 className="font-heading text-3xl font-extrabold text-nuit sm:text-4xl">
              Restaurants et commerces à {city.name}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-gris sm:text-base">
              L'annuaire des restaurants, commerces et professionnels de {city.name} qui proposent la vente à
              emporter ou la livraison. On y retrouve nos commerçants déjà partenaires ainsi que d'autres adresses
              locales repérées par Do You Geckoo.
            </p>
            {city.isActive && (
              <Link
                href={`/livraison/${city.seoSlug}`}
                className="mt-6 inline-block rounded-full bg-corail px-8 py-3.5 text-sm font-bold text-white transition hover:bg-corail-light"
              >
                Commander à {city.name} →
              </Link>
            )}
          </div>
        </div>

        {cityPros.length > 0 && (
          <section className="border-b border-gris-light py-14 sm:py-20">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <h2 className="mb-2 font-heading text-xl font-bold text-nuit">Partenaires Do You Geckoo</h2>
              <p className="mb-8 text-sm text-gris">Déjà livrés par nos livreurs à {city.name}.</p>
              {prosByCategory.map(([category, list]) => (
                <div key={category} className="mb-8 last:mb-0">
                  <h3 className="mb-4 text-xs font-bold uppercase tracking-wide text-golfe-green">
                    {CATEGORY_LABELS_PLAIN[category] ?? category}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((pro: PublicPro) => (
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
                            // eslint-disable-next-line @next/next/no-img-element -- asset statique local (public/)
                            <img src="/pro-fallback-badge.png" alt="Do You Geckoo" className="h-full w-full object-contain" />
                          )}
                        </div>
                        <p className="font-heading text-base font-bold text-nuit">{pro.businessName}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {cityProspects.length > 0 && (
          <section className="py-14 sm:py-20">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <h2 className="mb-2 font-heading text-xl font-bold text-nuit">Autres commerces à {city.name}</h2>
              <p className="mb-8 text-sm text-gris">
                Repérés par Do You Geckoo mais pas encore partenaires — vous ne pouvez pas encore commander chez eux
                via notre plateforme.
              </p>
              {prospectsByCategory.map(([category, list]) => (
                <div key={category} className="mb-8 last:mb-0">
                  <h3 className="mb-4 text-xs font-bold uppercase tracking-wide text-gris">
                    {CATEGORY_LABELS_PLAIN[category] ?? category}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((prospect: PublicProspect) => {
                      // Priorité au site officiel, puis la fiche Google, puis
                      // Facebook -- jamais de lien interne : ce commerce n'a
                      // pas de fiche Do You Geckoo, ce serait mentir sur ce
                      // qui l'attend au clic.
                      const link = prospect.websiteUrl ?? prospect.googleMapsUrl ?? prospect.facebookUrl;
                      const content = (
                        <>
                          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gris-light bg-white p-1.5">
                            {prospect.logoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element -- logo collé manuellement par Krys, voir schema.prisma
                              <img src={prospect.logoUrl} alt={prospect.businessName} className="h-full w-full object-contain" />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element -- asset statique local (public/)
                              <img src="/pro-fallback-badge.png" alt="" className="h-full w-full object-contain opacity-40" />
                            )}
                          </div>
                          <div>
                            <p className="font-heading text-base font-bold text-nuit">{prospect.businessName}</p>
                            <p className="mt-1 inline-block rounded-full bg-gris-light px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gris">
                              Pas encore partenaire
                            </p>
                          </div>
                        </>
                      );
                      return link ? (
                        <a
                          key={prospect.id}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 rounded-2xl border border-gris-light p-4 transition hover:border-golfe-green"
                        >
                          {content}
                        </a>
                      ) : (
                        <div
                          key={prospect.id}
                          className="flex items-center gap-3 rounded-2xl border border-gris-light p-4"
                        >
                          {content}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <p className="mt-10 text-center text-sm text-gris">
                Vous gérez un commerce à {city.name} ?{" "}
                <Link href="/devenir-partenaire" className="font-semibold text-golfe-green hover:underline">
                  Devenez partenaire Do You Geckoo →
                </Link>
              </p>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
