import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { fetchPublicPartnerPacks } from "@/lib/publicApi";
import { buildMetadata } from "@/lib/seo";
import { TIER_ORDER, PRO_STEPS, PRO_FAQ, type Step } from "@/lib/partnerContent";

export const metadata: Metadata = buildMetadata({
  title: "Devenir partenaire",
  description:
    "Rejoignez le réseau Do You Geckoo en tant que commerçant partenaire : commissions basses, liberté totale, inscription rapide sur le Golfe de Saint-Tropez.",
  path: "/devenir-partenaire",
});

function StepList({ steps, accent }: { steps: Step[]; accent: string }) {
  return (
    <ol className="space-y-5">
      {steps.map((step, i) => (
        <li key={step.title} className="flex gap-4">
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-heading text-sm font-bold text-white"
            style={{ backgroundColor: accent }}
          >
            {i + 1}
          </span>
          <div>
            <p className="font-bold text-nuit">{step.title}</p>
            <p className="mt-0.5 text-sm text-gris">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.q} className="rounded-2xl border border-gris-light p-5">
          <p className="font-bold text-nuit">{item.q}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-gris">{item.a}</p>
        </div>
      ))}
    </div>
  );
}

export default async function BecomePartnerPage() {
  const rawPacks = await fetchPublicPartnerPacks();
  const packs = TIER_ORDER.map((tier) => rawPacks.find((p) => p.tier === tier)).filter(
    (p): p is NonNullable<typeof p> => Boolean(p)
  );

  return (
    <>
      <Nav />
      <main className="bg-white">
        <div className="border-b border-gris-light bg-sable py-14 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <p className="text-sm font-bold uppercase tracking-widest text-golfe-green">Rejoignez le réseau</p>
            <h1 className="mt-3 font-heading text-3xl font-extrabold text-nuit sm:text-4xl">
              Devenir partenaire Do You Geckoo
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-gris sm:text-base">
              Que vous soyez commerçant ou que vous souhaitiez livrer, rejoignez le réseau local du Golfe de
              Saint-Tropez : commissions parmi les plus basses du secteur, liberté totale, et une équipe basée sur
              place.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm font-semibold">
              <a href="#commercants" className="rounded-full bg-corail px-5 py-2.5 text-white hover:bg-corail-light">🏪 Je suis commerçant</a>
              <Link href="/devenir-livreur" className="rounded-full bg-nuit px-5 py-2.5 text-white hover:bg-nuit-light">🛵 Je veux livrer</Link>
            </div>
          </div>
        </div>

        {/* Commerçants */}
        <section id="commercants" className="scroll-mt-24 border-t border-gris-light py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏪</span>
              <h2 className="font-heading text-2xl font-extrabold text-nuit sm:text-3xl">Devenir commerçant partenaire</h2>
            </div>
            <p className="mt-3 max-w-2xl text-sm text-gris">
              Vendez en ligne sans rien changer à votre façon de travailler. Vous gardez le contrôle de votre
              catalogue, de vos horaires et de vos prix — nous nous occupons de la mise en relation et de la
              livraison.
            </p>

            <div className="mt-10 grid gap-10 lg:grid-cols-2">
              <div>
                <h3 className="font-heading text-lg font-bold text-nuit">Comment ça se passe</h3>
                <div className="mt-5">
                  <StepList steps={PRO_STEPS} accent="#FF6B35" />
                </div>
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-nuit">Questions fréquentes</h3>
                <div className="mt-5">
                  <FaqList items={PRO_FAQ} />
                </div>
              </div>
            </div>

            {packs.length > 0 && (
              <div className="mt-14">
                <h3 className="text-center font-heading text-xl font-extrabold text-nuit sm:text-2xl">Nos packs partenaires</h3>
                <p className="mx-auto mt-2 max-w-xl text-center text-sm text-gris">
                  Un pack gratuit sans engagement, deux packs payants avec commission réduite et visibilité renforcée.
                </p>
                <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
                  {packs.map((pack) => (
                    <div
                      key={pack.tier}
                      className="rounded-3xl border border-gris-light p-6 sm:p-8"
                      style={pack.tier === "PREMIUM_PLUS" ? { borderColor: "#2ECC71", borderWidth: 2 } : undefined}
                    >
                      <h4 className="font-heading text-lg font-bold text-nuit">{pack.name}</h4>
                      <p className="mt-2">
                        <span className="font-heading text-3xl font-extrabold text-nuit">
                          {pack.priceMonthly > 0 ? `${pack.priceMonthly}€` : "Gratuit"}
                        </span>
                        {pack.priceMonthly > 0 && <span className="text-sm text-gris"> / mois</span>}
                      </p>
                      <ul className="mt-5 space-y-2 text-sm text-nuit">
                        {pack.features.map((feature) => (
                          <li key={feature}>✓ {feature}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-center text-xs text-gris">
                  Prix affichés TTC. Changement de pack ou résiliation possibles à tout moment depuis votre espace Pro.
                </p>
              </div>
            )}

            <div className="mt-12 text-center">
              <a
                href="https://pro.doyougeckoo.fr"
                className="inline-block rounded-full bg-corail px-8 py-3.5 text-sm font-bold text-white transition hover:bg-corail-light"
              >
                Créer mon compte commerçant →
              </a>
            </div>
          </div>
        </section>

        {/* Livreurs — page dédiée /devenir-livreur (23/08/2026, voir SEO/GEO) :
            ce bloc reste un simple renvoi, pas un doublon de contenu. */}
        <section className="border-t border-gris-light bg-nuit py-14 text-center text-white sm:py-20">
          <div className="mx-auto max-w-xl px-4 sm:px-6">
            <span className="text-3xl">🛵</span>
            <h2 className="mt-3 font-heading text-2xl font-extrabold sm:text-3xl">Vous voulez livrer ?</h2>
            <p className="mt-3 text-sm text-white/80">
              Scooter, vélo ou voiture : livrez quand vous voulez, sur les zones que vous choisissez, et gardez une
              part plus juste de chaque course.
            </p>
            <Link
              href="/devenir-livreur"
              className="mt-8 inline-block rounded-full bg-golfe-green px-8 py-3.5 text-sm font-bold text-nuit transition hover:bg-white"
            >
              Devenir livreur →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
