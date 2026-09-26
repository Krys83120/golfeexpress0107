import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { buildMetadata } from "@/lib/seo";
import { RIDER_STEPS, RIDER_REQUIREMENTS, RIDER_FAQ } from "@/lib/partnerContent";
import { RIDER_PAY } from "@/lib/economics";

export const metadata: Metadata = buildMetadata({
  title: "Devenir livreur",
  description:
    "Devenez livreur Do You Geckoo dans le Golfe de Saint-Tropez : horaires libres, rémunération transparente affichée avant chaque course, inscription en ligne.",
  path: "/devenir-livreur",
});

const riderFaqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: RIDER_FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default function DevenirLivreurPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(riderFaqJsonLd) }} />
      <Nav />
      <main className="bg-white">
        <div className="border-b border-gris-light bg-nuit py-14 text-white sm:py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <p className="text-sm font-bold uppercase tracking-widest text-golfe-green">Rejoignez le réseau</p>
            <h1 className="mt-3 font-heading text-3xl font-extrabold sm:text-4xl">
              Devenir livreur dans le Golfe de Saint-Tropez
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-white/80 sm:text-base">
              Scooter, vélo ou voiture : livrez quand vous voulez, sur les zones que vous choisissez, avec une
              rémunération affichée avant chaque course ({RIDER_PAY.typicalLabel} sur la majorité des trajets). Voir le
              détail du calcul sur{" "}
              <Link href="/notre-modele" className="underline hover:text-white">
                notre modèle économique
              </Link>
              .
            </p>
            <a
              href="https://livreur.doyougeckoo.fr/?mode=signup"
              className="mt-8 inline-block rounded-full bg-golfe-green px-8 py-3.5 text-sm font-bold text-nuit transition hover:bg-white"
            >
              Créer mon compte livreur →
            </a>
          </div>
        </div>

        {/* Démo vidéo de l'espace Livreur (26/09/2026, "c'est un +" -- demande
            de Krys) : captures d'écran réelles de l'app (mobile), habillées
            en vidéo de présentation. Fichier auto-hébergé dans public/. */}
        <section className="border-t border-gris-light py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid items-center gap-8 overflow-hidden rounded-3xl border border-gris-light bg-sable p-6 sm:p-10 lg:grid-cols-2">
              <div className="order-2 mx-auto w-full max-w-[240px] lg:order-1">
                <video
                  className="w-full rounded-3xl shadow-lg"
                  src="/demo-livreur-doyougeckoo.mp4"
                  poster="/demo-livreur-poster.jpg"
                  controls
                  muted
                  loop
                  playsInline
                  preload="none"
                >
                  Votre navigateur ne prend pas en charge la vidéo. Vous pouvez{" "}
                  <a href="/demo-livreur-doyougeckoo.mp4">la télécharger ici</a>.
                </video>
              </div>
              <div className="order-1 lg:order-2">
                <p className="text-sm font-bold uppercase tracking-widest text-golfe-green">Démo</p>
                <h2 className="mt-2 font-heading text-xl font-extrabold text-nuit sm:text-2xl">
                  Découvrez votre espace Livreur en vidéo
                </h2>
                <p className="mt-3 text-sm text-gris">
                  Passage en ligne, choix des courses ou des Colis Express, suivi de vos gains versés via Stripe,
                  statistiques et profil : voici à quoi ressemble l&apos;application, avant même de vous inscrire.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-10 lg:grid-cols-2">
              <div>
                <h2 className="font-heading text-lg font-bold text-nuit">Comment ça se passe</h2>
                <ol className="mt-5 space-y-5">
                  {RIDER_STEPS.map((step, i) => (
                    <li key={step.title} className="flex gap-4">
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-golfe-green font-heading text-sm font-bold text-nuit">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-bold text-nuit">{step.title}</p>
                        <p className="mt-0.5 text-sm text-gris">{step.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <h2 className="font-heading text-lg font-bold text-nuit">Conditions requises</h2>
                <ul className="mt-5 space-y-2.5 text-sm text-nuit">
                  {RIDER_REQUIREMENTS.map((req) => (
                    <li key={req} className="flex gap-2">
                      <span className="text-golfe-green">✓</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-14">
              <h2 className="font-heading text-lg font-bold text-nuit">Questions fréquentes</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {RIDER_FAQ.map((item) => (
                  <div key={item.q} className="rounded-2xl border border-gris-light p-5">
                    <p className="font-bold text-nuit">{item.q}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-gris">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-12 text-center">
              <a
                href="https://livreur.doyougeckoo.fr/?mode=signup"
                className="inline-block rounded-full bg-golfe-green px-8 py-3.5 text-sm font-bold text-nuit transition hover:bg-golfe-green-dark"
              >
                Créer mon compte livreur →
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
