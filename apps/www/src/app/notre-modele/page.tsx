import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { EconomicsComparison } from "@/components/EconomicsComparison";
import { buildMetadata } from "@/lib/seo";
import { PLATFORM_COMMISSION, RIDER_PAY, COMPETITOR_COMMISSION_SOURCE } from "@/lib/economics";

export const metadata: Metadata = buildMetadata({
  title: "Notre modèle économique",
  description:
    "Commission commerçant, rémunération livreur, philosophie : comment fonctionne réellement Do You Geckoo, et pourquoi le modèle est différent des grandes plateformes de livraison.",
  path: "/notre-modele",
});

export default function NotreModelePage() {
  return (
    <>
      <Nav />
      <main className="bg-white">
        <div className="border-b border-gris-light bg-sable py-14 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <p className="text-sm font-bold uppercase tracking-widest text-golfe-green">Transparence</p>
            <h1 className="mt-3 font-heading text-3xl font-extrabold text-nuit sm:text-4xl">Notre modèle économique</h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-gris sm:text-base">
              Do You Geckoo n'existe pas pour être "moins cher" en apparence : le modèle est construit pour que
              l'argent d'une commande se répartisse différemment entre plateforme, commerçant et livreur. Voici
              exactement comment, sans chiffre inventé.
            </p>
          </div>
        </div>

        {/* Commission commerçant */}
        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="font-heading text-xl font-bold text-nuit sm:text-2xl">La commission commerçant</h2>
            <p className="mt-4 text-sm leading-relaxed text-gris sm:text-base">
              Chaque commerçant partenaire choisit un forfait (voir{" "}
              <Link href="/devenir-partenaire#commercants" className="font-semibold text-golfe-green hover:underline">
                nos packs partenaires
              </Link>
              ), et paie une commission {PLATFORM_COMMISSION.shortLabel} sur les commandes effectivement livrées — jamais
              d'abonnement fixe obligatoire pour vendre. Pas de frais cachés, pas de mise en avant payante déguisée en
              "featured" : le classement des commerçants dans l'application reste basé sur la pertinence pour le
              client (ville, catégorie, avis), pas sur le montant payé.
            </p>
          </div>
        </section>

        {/* Rémunération livreur */}
        <section className="border-t border-gris-light bg-sable py-14 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="font-heading text-xl font-bold text-nuit sm:text-2xl">La rémunération du livreur</h2>
            <p className="mt-4 text-sm leading-relaxed text-gris sm:text-base">
              Chaque course affiche un montant calculé simplement : {RIDER_PAY.baseEur}€ de base, plus {RIDER_PAY.perKmEur}€ par
              kilomètre parcouru, avec un minimum garanti de {RIDER_PAY.minimumEur}€ par course. Sur la majorité des trajets
              intra-Golfe, ça représente {RIDER_PAY.typicalLabel} — affiché avant acceptation, sans surprise. Le livreur reste
              indépendant (auto-entrepreneur ou statut équivalent) : Do You Geckoo n'est pas son employeur, il choisit
              ses horaires et peut refuser une course sans justification.
            </p>
          </div>
        </section>

        {/* Comparatif chiffré */}
        <EconomicsComparison />

        {/* Philosophie */}
        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="font-heading text-xl font-bold text-nuit sm:text-2xl">Pourquoi ce modèle</h2>
            <p className="mt-4 text-sm leading-relaxed text-gris sm:text-base">
              Les grandes plateformes de livraison optimisent à l'échelle nationale ou mondiale, avec des commissions
              qui peuvent atteindre {COMPETITOR_COMMISSION_SOURCE.maxPct}% chez certaines d'entre elles (voir source citée plus haut) et une
              rémunération livreur souvent tirée vers le bas par la concurrence entre plateformes. Do You Geckoo fait
              le choix inverse : rester une plateforme locale, au service d'un seul territoire — le Golfe de
              Saint-Tropez — pour que les commerçants gardent une marge qui leur permet de continuer à exister face
              aux acteurs nationaux, et que les livreurs qui font le trajet en vivent mieux. Ce n'est pas un
              positionnement marketing : c'est la raison d'être du modèle de commission décrit ci-dessus.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-gris sm:text-base">
              On ne prétend pas être parfait ni proposer le prix le plus bas sur chaque commande : on affiche ce qui
              est vérifiable, avec ses sources, et on corrige ce qui ne l'est pas dès qu'on le repère.
            </p>
          </div>
        </section>

        <div className="border-t border-gris-light bg-nuit py-14 text-center text-white sm:py-16">
          <div className="mx-auto max-w-xl px-4 sm:px-6">
            <h2 className="font-heading text-xl font-bold sm:text-2xl">Envie de rejoindre le réseau ?</h2>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm font-semibold">
              <Link href="/devenir-partenaire#commercants" className="rounded-full bg-corail px-6 py-3 text-white hover:bg-corail-light">
                🏪 Devenir commerçant partenaire
              </Link>
              <Link href="/devenir-livreur" className="rounded-full bg-golfe-green px-6 py-3 text-nuit hover:bg-white">
                🛵 Devenir livreur
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
