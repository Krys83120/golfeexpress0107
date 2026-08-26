import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { buildMetadata } from "@/lib/seo";
import {
  fetchPublicProBySlug,
  fetchPublicProProducts,
  fetchPublicProReviews,
  buildProSlug,
  CATEGORY_LABELS,
  CATEGORY_LABELS_PLAIN,
  CATEGORY_SCHEMA_TYPE,
} from "@/lib/publicApi";
import { SITE_URL } from "@/lib/seo";

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const pro = await fetchPublicProBySlug(params.slug);
  if (!pro) return {};
  const city = pro.addresses?.[0]?.city;
  const category = CATEGORY_LABELS_PLAIN[pro.category] ?? pro.category;
  // Titre et description incluent explicitement ville + catégorie + nom —
  // en plus du slug d'URL déjà optimisé, ça maximise la pertinence perçue
  // par les moteurs de recherche pour des requêtes du type
  // "[catégorie] [ville]" (ex: "restaurant Sainte-Maxime").
  const title = city ? `${pro.businessName} — ${category} à ${city}` : `${pro.businessName} — ${category}`;
  const description =
    pro.description ??
    `${pro.businessName}, ${category.toLowerCase()} ${city ? `à ${city} ` : ""}livré par Do You Geckoo dans tout le Golfe de Saint-Tropez.`;
  // Canonical construit à partir du MÊME slug que buildProSlug (pas
  // params.slug directement) : si un jour deux slugs différents résolvent
  // vers le même Pro (ex: ancien lien partagé après renommage), la
  // canonical pointe toujours vers l'URL courante plutôt que de dupliquer
  // le signal SEO entre les deux variantes.
  return buildMetadata({ title, description, path: `/commercants/${buildProSlug(pro)}`, image: pro.coverImage ?? undefined });
}

const DAY_LABELS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

/**
 * Un jour peut avoir plusieurs créneaux (Pro en coupure, ex: 10h-14h puis
 * 18h-23h — voir apps/pro/src/pages/SettingsPage.tsx) : on regroupe donc
 * par jour pour l'affichage visible ci-dessous (le JSON-LD
 * OpeningHoursSpecification, lui, accepte nativement plusieurs entrées pour
 * le même dayOfWeek et n'a pas besoin de ce regroupement).
 */
function groupHoursByDay(hours: { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }[]) {
  const byDay = new Map<number, typeof hours>();
  for (const h of hours) byDay.set(h.dayOfWeek, [...(byDay.get(h.dayOfWeek) ?? []), h]);
  return [...byDay.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([dayOfWeek, rows]) => ({
      dayOfWeek,
      isClosed: rows.every((r) => r.isClosed),
      ranges: rows.filter((r) => !r.isClosed).sort((a, b) => a.openTime.localeCompare(b.openTime)),
    }));
}
const SCHEMA_DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const ORDER_URL = "https://commander.doyougeckoo.fr";

export default async function CommercantDetailPage({ params }: PageProps) {
  const pro = await fetchPublicProBySlug(params.slug);
  if (!pro) notFound();

  const products = await fetchPublicProProducts(pro.id);
  const reviews = await fetchPublicProReviews(pro.id);
  const categories = Array.from(new Set(products.map((p) => p.category)));
  const city = pro.addresses?.[0]?.city;
  const categoryLabel = CATEGORY_LABELS_PLAIN[pro.category] ?? pro.category;
  const slug = buildProSlug(pro);
  const pageUrl = `${SITE_URL}/commercants/${slug}`;
  const address = pro.addresses?.[0];

  // JSON-LD commerçant -- type le plus précis disponible (voir
  // CATEGORY_SCHEMA_TYPE), uniquement les champs réellement connus.
  // Volontairement PAS d'AggregateRating tant que ratingCount est trop
  // faible pour être représentatif (seuil arbitraire mais défendable : sous
  // 3 avis, une moyenne peut être entièrement portée par un seul avis).
  const proJsonLd = {
    "@context": "https://schema.org",
    "@type": CATEGORY_SCHEMA_TYPE[pro.category] ?? "Store",
    "@id": `${pageUrl}#business`,
    name: pro.businessName,
    url: pageUrl,
    ...(pro.description ? { description: pro.description } : {}),
    ...(pro.coverImage ? { image: pro.coverImage } : {}),
    ...(pro.phone ? { telephone: pro.phone } : {}),
    ...(address
      ? {
          address: { "@type": "PostalAddress", addressLocality: address.city, addressCountry: "FR" },
          geo: { "@type": "GeoCoordinates", latitude: address.lat, longitude: address.lng },
        }
      : {}),
    ...(pro.openingHours && pro.openingHours.length > 0
      ? {
          openingHoursSpecification: pro.openingHours
            .filter((h) => !h.isClosed)
            .map((h) => ({
              "@type": "OpeningHoursSpecification",
              dayOfWeek: `https://schema.org/${SCHEMA_DAY_NAMES[h.dayOfWeek]}`,
              opens: h.openTime,
              closes: h.closeTime,
            })),
        }
      : {}),
    ...(pro.rating && pro.ratingCount >= 3
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: Number(pro.rating), reviewCount: pro.ratingCount } }
      : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Commerçants", item: `${SITE_URL}/commercants` },
      ...(city ? [{ "@type": "ListItem", position: 3, name: city, item: `${SITE_URL}/commercants?city=${encodeURIComponent(city)}` }] : []),
      { "@type": "ListItem", position: city ? 4 : 3, name: pro.businessName, item: pageUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(proJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Nav />
      <main className="bg-white">
        {/* Bandeau couverture */}
        <div className="h-48 w-full bg-sable sm:h-64">
          {pro.coverImage && <img src={pro.coverImage} alt="" className="h-full w-full object-cover" />}
        </div>

        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          {/* Fil d'Ariane — reprend ville / catégorie / nom, à la fois
              utile pour l'utilisateur et pour le maillage interne SEO
              (liens texte vers les pages catégorie/ville). */}
          <nav aria-label="Fil d'Ariane" className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-gris">
            <Link href="/commercants" className="hover:text-golfe-green hover:underline">
              Commerçants
            </Link>
            {city && (
              <>
                <span>/</span>
                <span>{city}</span>
              </>
            )}
            <span>/</span>
            <span>{categoryLabel}</span>
            <span>/</span>
            <span className="font-semibold text-nuit">{pro.businessName}</span>
          </nav>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-corail">{CATEGORY_LABELS[pro.category] ?? pro.category}</p>
              <h1 className="mt-1 font-heading text-3xl font-extrabold text-nuit">{pro.businessName}</h1>
              {pro.description && <p className="mt-3 max-w-2xl text-gris">{pro.description}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gris">
                {pro.rating && pro.ratingCount > 0 && <span>⭐ {Number(pro.rating).toFixed(1)} ({pro.ratingCount} avis)</span>}
                {pro.googleRating && (
                  <span>🇬 {Number(pro.googleRating).toFixed(1)} ({pro.googleRatingCount} avis Google)</span>
                )}
                {city && <span>📍 {city}</span>}
              </div>
            </div>
            <a
              href={`${ORDER_URL}/?pro=${pro.id}`}
              className="flex-shrink-0 rounded-full bg-golfe-green px-7 py-3 text-center text-sm font-bold text-nuit transition hover:bg-golfe-green-dark hover:text-white"
            >
              Commander chez {pro.businessName}
            </a>
          </div>

          {pro.openingHours && pro.openingHours.length > 0 && (
            <div className="mt-8 rounded-2xl bg-sable p-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gris">Horaires d'ouverture</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-4">
                {groupHoursByDay(pro.openingHours).map((day) => (
                  <div key={day.dayOfWeek} className="flex justify-between gap-2">
                    <span className="text-gris">{DAY_LABELS[day.dayOfWeek]}</span>
                    <span className="font-medium text-nuit">
                      {day.isClosed ? "Fermé" : day.ranges.map((r) => `${r.openTime}–${r.closeTime}`).join(", ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Menu / produits */}
          <div className="mt-12">
            <h2 className="mb-6 font-heading text-xl font-bold text-nuit">Produits</h2>
            {products.length === 0 ? (
              <p className="text-gris">Ce commerçant n'a pas encore ajouté de produits.</p>
            ) : (
              categories.map((cat) => (
                <div key={cat} className="mb-8">
                  <h3 className="mb-3 font-heading text-base font-bold text-nuit">{cat}</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {products
                      .filter((p) => p.category === cat)
                      .map((product) => (
                        <a
                          key={product.id}
                          href={`${ORDER_URL}/?pro=${pro.id}&product=${product.id}`}
                          className="flex gap-4 rounded-2xl border border-gris-light p-3 transition hover:border-golfe-green"
                        >
                          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-sable">
                            {product.image?.startsWith("http") ? (
                              <img src={product.image} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-2xl">{product.image ?? "🍽️"}</div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-nuit">{product.name}</p>
                            {product.description && (
                              <p className="mt-0.5 line-clamp-2 text-xs text-gris">{product.description}</p>
                            )}
                            <p className="mt-1 text-sm font-bold text-golfe-green">{product.price.toFixed(2)} €</p>
                          </div>
                        </a>
                      ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <p className="mt-4 text-center text-xs text-gris">
            Pour commander, connectez-vous ou créez votre compte sur l'app Client — c'est rapide et gratuit.
          </p>

          {/* Avis clients — visibles par tout visiteur, même non connecté
              (voir GET /api/pros/[proId]/reviews, route publique). */}
          <div className="mt-12 border-t border-gris-light pt-8">
            <h2 className="mb-6 font-heading text-xl font-bold text-nuit">Avis clients</h2>
            {reviews.length === 0 ? (
              <p className="text-gris">Aucun avis pour le moment.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {reviews.map((review) => {
                  const clientName = review.client?.user?.firstName ? `${review.client.user.firstName}` : "Client";
                  return (
                    <div key={review.id} className="rounded-2xl border border-gris-light p-4">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-sm font-semibold text-nuit">{clientName}</span>
                        <span className="text-xs font-bold text-corail">⭐ {review.proRating}</span>
                      </div>
                      {review.proComment && <p className="text-sm text-gris">{review.proComment}</p>}
                      {review.proReply && (
                        <div className="mt-2 rounded-xl bg-sable p-3">
                          <p className="mb-0.5 text-xs font-semibold text-golfe-green">Réponse de {pro.businessName}</p>
                          <p className="text-xs text-gris">{review.proReply}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
