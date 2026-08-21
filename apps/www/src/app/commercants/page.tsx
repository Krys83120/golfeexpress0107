import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { fetchPublicPros, buildProSlug, CATEGORY_LABELS_PLAIN } from "@/lib/publicApi";

// Page listant tous les commerçants partenaires — cible du lien "Nos
// commerçants" de la nav principale (NavClient.tsx) et du fil d'Ariane des
// pages détail commerçant, qui pointaient jusqu'ici vers /commercants sans
// qu'aucune page ne réponde à cette route (404 sitewide, corrigé le
// 21/08/2026).
export const metadata: Metadata = {
  title: "Nos commerçants partenaires — Do You Geckoo",
  description:
    "Découvrez tous les commerçants partenaires de Do You Geckoo, livrés dans tout le Golfe de Saint-Tropez.",
};

export default async function CommercantsListPage() {
  const pros = await fetchPublicPros();

  return (
    <>
      <Nav />
      <main className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <h1 className="mb-2 text-center font-heading text-2xl font-extrabold text-nuit sm:text-3xl">
            Nos commerçants partenaires
          </h1>
          <p className="mb-8 text-center text-sm text-gris">
            {pros.length > 0
              ? `${pros.length} commerçant${pros.length > 1 ? "s" : ""} livré${pros.length > 1 ? "s" : ""} dans tout le Golfe de Saint-Tropez.`
              : "La liste de nos commerçants partenaires arrive très bientôt."}
          </p>

          {pros.length === 0 ? (
            <p className="text-center text-gris">Aucun commerçant disponible pour le moment.</p>
          ) : (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
              {pros.map((pro) => {
                const city = pro.addresses?.[0]?.city;
                const categoryLabel = CATEGORY_LABELS_PLAIN[pro.category] ?? pro.category;
                return (
                  <a
                    key={pro.id}
                    href={`/commercants/${buildProSlug(pro)}`}
                    className="flex flex-col items-center gap-2 text-center transition hover:opacity-80"
                  >
                    <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border border-gris-light bg-white p-4 shadow-sm sm:h-40 sm:w-40">
                      {pro.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element -- logo dynamique par commerçant (URL Supabase Storage)
                        <img src={pro.logo} alt={pro.businessName} className="h-full w-full object-contain" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element -- asset statique local (public/), pas de bénéfice à next/image ici
                        <img src="/pro-fallback-badge.png" alt="Do You Geckoo" className="h-full w-full object-contain" />
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs font-semibold text-nuit sm:text-sm">{pro.businessName}</p>
                    <p className="text-[11px] text-gris">
                      {categoryLabel}
                      {city ? ` · ${city}` : ""}
                    </p>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
