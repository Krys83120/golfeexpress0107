import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { CommercantsBrowser } from "@/components/CommercantsBrowser";
import { fetchPublicPros } from "@/lib/publicApi";

export const metadata: Metadata = {
  title: "Nos commerçants",
  description:
    "Découvrez tous les commerçants partenaires de Do You Geckoo sur Sainte-Maxime et le Golfe de Saint-Tropez : restaurants, boulangeries, fleuristes et plus, triés selon votre position.",
};

export const revalidate = 60;

export default async function CommercantsPage() {
  const pros = await fetchPublicPros();

  return (
    <>
      <Nav />
      <main className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="mb-3 text-center text-sm font-bold uppercase tracking-widest text-corail">Golfe de Saint-Tropez</p>
          <h1 className="mx-auto max-w-2xl text-center font-heading text-3xl font-extrabold leading-tight text-nuit sm:text-4xl">
            Tous nos commerçants
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-center text-gris">
            Parcourez les commerces du Golfe et découvrez leurs produits, sans avoir besoin de créer un compte —
            connectez-vous seulement au moment de commander.
          </p>

          <div className="mt-12">
            <CommercantsBrowser pros={pros} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
