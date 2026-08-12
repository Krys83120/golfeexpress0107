import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { fetchPublicPro, fetchPublicProProducts, CATEGORY_LABELS } from "@/lib/publicApi";

interface PageProps {
  params: { proId: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const pro = await fetchPublicPro(params.proId);
  if (!pro) return {};
  return {
    title: pro.businessName,
    description: pro.description ?? `Découvrez les produits de ${pro.businessName} sur GolfeExpress, livraison locale du Golfe de Saint-Tropez.`,
  };
}

const DAY_LABELS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const ORDER_URL = "https://deploy-client-gamma.vercel.app";

export default async function CommercantDetailPage({ params }: PageProps) {
  const pro = await fetchPublicPro(params.proId);
  if (!pro) notFound();

  const products = await fetchPublicProProducts(params.proId);
  const categories = Array.from(new Set(products.map((p) => p.category)));

  return (
    <>
      <Nav />
      <main className="bg-white">
        {/* Bandeau couverture */}
        <div className="h-48 w-full bg-sable sm:h-64">
          {pro.coverImage && <img src={pro.coverImage} alt="" className="h-full w-full object-cover" />}
        </div>

        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
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
                {pro.addresses?.[0]?.city && <span>📍 {pro.addresses[0].city}</span>}
              </div>
            </div>
            <a
              href={ORDER_URL}
              className="flex-shrink-0 rounded-full bg-golfe-green px-7 py-3 text-center text-sm font-bold text-nuit transition hover:bg-golfe-green-dark hover:text-white"
            >
              Commander chez {pro.businessName}
            </a>
          </div>

          {pro.openingHours && pro.openingHours.length > 0 && (
            <div className="mt-8 rounded-2xl bg-sable p-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gris">Horaires d'ouverture</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-4">
                {[...pro.openingHours]
                  .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                  .map((h) => (
                    <div key={h.dayOfWeek} className="flex justify-between gap-2">
                      <span className="text-gris">{DAY_LABELS[h.dayOfWeek]}</span>
                      <span className="font-medium text-nuit">{h.isClosed ? "Fermé" : `${h.openTime}–${h.closeTime}`}</span>
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
                          href={ORDER_URL}
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
        </div>
      </main>
      <Footer />
    </>
  );
}
