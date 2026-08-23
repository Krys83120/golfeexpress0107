import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "À propos",
  description:
    "Do You Geckoo est une plateforme de livraison locale, pensée pour le Golfe de Saint-Tropez : commerçants mieux traités, livreurs mieux payés, sans surcoût pour le client.",
  path: "/a-propos",
});

export default function AProposPage() {
  return (
    <>
      <Nav />
      <main className="bg-white">
        <div className="border-b border-gris-light bg-sable py-14 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <p className="text-sm font-bold uppercase tracking-widest text-golfe-green">À propos</p>
            <h1 className="mt-3 font-heading text-3xl font-extrabold text-nuit sm:text-4xl">
              Une plateforme locale, pour le Golfe de Saint-Tropez
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-gris sm:text-base">
              Do You Geckoo est basé à Sainte-Maxime, avec une équipe sur place plutôt qu'un centre d'appels
              délocalisé. Pas une antenne régionale d'une plateforme internationale : le service est pensé, réglé et
              exploité pour ce territoire précis.
            </p>
          </div>
        </div>

        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="font-heading text-xl font-bold text-nuit sm:text-2xl">Pourquoi une plateforme locale</h2>
            <p className="mt-4 text-sm leading-relaxed text-gris sm:text-base">
              Les grandes plateformes de livraison optimisent à l'échelle nationale, avec des commissions et des
              règles pensées pour des milliers de villes à la fois. Do You Geckoo fait le choix inverse : se
              concentrer sur un seul territoire pour mieux le connaître — les rues, les horaires réels des
              commerces, les distances qui comptent vraiment pour un livreur à scooter l'été sur la Nationale 98.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-gris sm:text-base">
              Concrètement, ça se traduit par un modèle de commission détaillé et sourcé (voir{" "}
              <Link href="/notre-modele" className="font-semibold text-golfe-green hover:underline">
                notre modèle économique
              </Link>
              ), et par un service qui s'étend commune par commune plutôt que d'annoncer une couverture qui n'existe
              pas encore.
            </p>
          </div>
        </section>

        <section className="border-t border-gris-light bg-sable py-14 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="font-heading text-xl font-bold text-nuit sm:text-2xl">Ce que ça change pour vous</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              <div>
                <p className="text-sm font-bold text-corail">Pour les clients</p>
                <p className="mt-1.5 text-sm text-gris">
                  Vos commerces du quotidien, livrés en 20 à 30 minutes, sans changer le prix que vous auriez payé en
                  magasin.
                </p>
              </div>
              <div>
                <p className="text-sm font-bold text-corail">Pour les commerçants</p>
                <p className="mt-1.5 text-sm text-gris">
                  Une commission nettement sous la moyenne du secteur, sans abonnement fixe obligatoire pour
                  commencer à vendre.
                </p>
              </div>
              <div>
                <p className="text-sm font-bold text-corail">Pour les livreurs</p>
                <p className="mt-1.5 text-sm text-gris">
                  Un montant affiché avant chaque course, la liberté de choisir ses horaires, et un statut
                  d'indépendant respecté.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="border-t border-gris-light py-14 text-center sm:py-16">
          <div className="mx-auto max-w-xl px-4 sm:px-6">
            <h2 className="font-heading text-xl font-bold text-nuit sm:text-2xl">En savoir plus</h2>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm font-semibold">
              <Link href="/notre-modele" className="rounded-full bg-nuit px-6 py-3 text-white hover:bg-nuit-light">
                Notre modèle économique
              </Link>
              <Link href="/comment-ca-marche" className="rounded-full border border-gris-light px-6 py-3 text-nuit hover:border-golfe-green">
                Comment ça marche
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
