import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { fetchPublicPartnerPacks } from "@/lib/publicApi";

export const metadata: Metadata = {
  title: "Devenir partenaire",
  description:
    "Rejoignez le réseau Do You Geckoo en tant que commerçant ou livreur partenaire : commissions basses, liberté totale, inscription rapide sur le Golfe de Saint-Tropez.",
  robots: { index: true, follow: true },
};

const TIER_ORDER = ["FREE", "PREMIUM", "PREMIUM_PLUS"];

interface Step {
  title: string;
  description: string;
}

const PRO_STEPS: Step[] = [
  { title: "Créez votre compte Pro", description: "Renseignez le nom de votre commerce, votre catégorie et vos coordonnées." },
  { title: "Fournissez vos informations légales", description: "Numéro SIRET et extrait Kbis à jour (moins de 3 mois) — nécessaires pour activer votre compte." },
  { title: "Validation par notre équipe", description: "Vos informations sont vérifiées manuellement, généralement sous 24 à 48h." },
  { title: "Mettez en ligne votre catalogue", description: "Ajoutez vos produits, photos, options et horaires — vous gardez la main sur tout." },
  { title: "Recevez vos premières commandes", description: "Chaque commande arrive en temps réel, un livreur du réseau vient la récupérer." },
];

const PRO_FAQ: { q: string; a: string }[] = [
  { q: "L'inscription est-elle payante ?", a: "Non, l'inscription est gratuite et le pack Free est disponible sans engagement. Vous pouvez souscrire à un pack payant à tout moment si vous souhaitez réduire votre commission." },
  { q: "Ai-je besoin d'un SIRET pour vendre ?", a: "Oui, la vente de produits doit être déclarée. Un numéro SIRET valide et un extrait Kbis à jour sont nécessaires pour activer votre compte." },
  { q: "Puis-je changer de pack ou résilier ?", a: "Oui, à tout moment, directement depuis votre espace Pro, sans engagement de durée." },
  { q: "Comment suis-je payé ?", a: "Les sommes dues sont reversées via Stripe Connect, déduction faite de la commission de votre pack. Vos factures restent consultables à tout moment." },
];

const RIDER_STEPS: Step[] = [
  { title: "Créez votre compte Livreur", description: "Quelques informations de base pour démarrer votre inscription." },
  { title: "Complétez votre dossier", description: "Pièce d'identité, selfie de vérification, photo de profil (obligatoire, visible par vos clients), véhicule, assurance, statut professionnel et IBAN." },
  { title: "Validation sous 24 à 48h", description: "Notre équipe vérifie votre dossier manuellement et vous informe du résultat." },
  { title: "Passez en ligne et livrez", description: "Aucun horaire imposé — vous choisissez quand et où vous êtes disponible." },
];

const RIDER_REQUIREMENTS = [
  "Être majeur et disposer d'un moyen de transport en règle (scooter, vélo, voiture...)",
  "Fournir une pièce d'identité valide",
  "Fournir une attestation d'assurance responsabilité civile professionnelle",
  "Avoir un statut d'indépendant (auto-entrepreneur ou équivalent)",
  "Fournir une photo de profil — obligatoire, c'est elle qui sera visible par vos clients",
];

const RIDER_FAQ: { q: string; a: string }[] = [
  { q: "Dois-je avoir un statut d'auto-entrepreneur ?", a: "Oui, vous exercez en toute indépendance : auto-entrepreneur, société ou tout autre statut autorisé. Do You Geckoo n'est pas votre employeur." },
  { q: "Puis-je choisir mes horaires ?", a: "Oui, entièrement. Vous passez en ligne quand vous le souhaitez, sur les zones que vous choisissez, et pouvez refuser une course sans justification." },
  { q: "Pourquoi la photo de profil est-elle obligatoire ?", a: "C'est elle qui rassure le client pendant sa livraison — comme sur les plateformes comparables, il doit pouvoir identifier son livreur. Votre dossier ne peut pas être validé sans elle." },
  { q: "Comment suis-je payé ?", a: "Chaque course affiche son montant avant acceptation. Vos gains sont visibles en temps réel et peuvent être retirés vers votre compte bancaire via Stripe Connect." },
];

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
              <a href="#livreurs" className="rounded-full bg-nuit px-5 py-2.5 text-white hover:bg-nuit-light">🛵 Je veux livrer</a>
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

        {/* Livreurs */}
        <section id="livreurs" className="scroll-mt-24 border-t border-gris-light bg-nuit py-14 text-white sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🛵</span>
              <h2 className="font-heading text-2xl font-extrabold sm:text-3xl">Devenir livreur partenaire</h2>
            </div>
            <p className="mt-3 max-w-2xl text-sm text-white/80">
              Scooter, vélo ou voiture : livrez quand vous voulez, sur les zones que vous choisissez, et gardez une
              part plus juste de chaque course.
            </p>

            <div className="mt-10 grid gap-10 lg:grid-cols-2">
              <div>
                <h3 className="font-heading text-lg font-bold">Comment ça se passe</h3>
                <ol className="mt-5 space-y-5">
                  {RIDER_STEPS.map((step, i) => (
                    <li key={step.title} className="flex gap-4">
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-golfe-green font-heading text-sm font-bold text-nuit">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-bold">{step.title}</p>
                        <p className="mt-0.5 text-sm text-white/70">{step.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <h3 className="font-heading text-lg font-bold">Conditions requises</h3>
                <ul className="mt-5 space-y-2.5 text-sm text-white/85">
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
              <h3 className="font-heading text-lg font-bold">Questions fréquentes</h3>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {RIDER_FAQ.map((item) => (
                  <div key={item.q} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="font-bold">{item.q}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-white/70">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-12 text-center">
              <a
                href="https://livreur.doyougeckoo.fr"
                className="inline-block rounded-full bg-golfe-green px-8 py-3.5 text-sm font-bold text-nuit transition hover:bg-white"
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
