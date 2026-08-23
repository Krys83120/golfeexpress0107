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
              href="https://livreur.doyougeckoo.fr"
              className="mt-8 inline-block rounded-full bg-golfe-green px-8 py-3.5 text-sm font-bold text-nuit transition hover:bg-white"
            >
              Créer mon compte livreur →
            </a>
          </div>
        </div>

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
                href="https://livreur.doyougeckoo.fr"
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
