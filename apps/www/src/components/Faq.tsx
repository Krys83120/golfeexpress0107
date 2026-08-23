import { PLATFORM_COMMISSION, COMPETITOR_COMMISSION_SOURCE } from "@/lib/economics";

const FAQS = [
  {
    q: "Dans quelles villes Do You Geckoo livre-t-il ?",
    a: "Do You Geckoo livre actuellement à Sainte-Maxime et s'étend progressivement à l'ensemble du Golfe de Saint-Tropez (Saint-Tropez, Grimaud, Cogolin, Port-Grimaud). La zone de livraison exacte s'affiche automatiquement selon votre adresse dans l'application.",
  },
  {
    q: "Quel est le délai moyen de livraison ?",
    a: "La majorité des commandes sont livrées entre 20 et 30 minutes après validation, selon la distance entre le commerçant et l'adresse de livraison et la disponibilité des livreurs sur la zone.",
  },
  {
    q: "En quoi Do You Geckoo est-il différent d'Uber Eats ?",
    a: `Do You Geckoo applique une commission commerçant nettement plus basse (${PLATFORM_COMMISSION.fromLabel}, contre des taux qui peuvent atteindre ${COMPETITOR_COMMISSION_SOURCE.maxPct}% sur les grandes plateformes) et reverse une part plus importante de chaque course au livreur. C'est une plateforme locale, pensée pour le Golfe de Saint-Tropez, pas un acteur mondial.`,
  },
  {
    q: "Comment devenir livreur chez Do You Geckoo ?",
    a: "Inscrivez-vous en ligne avec votre pièce d'identité, les informations de votre véhicule et votre IBAN. Votre dossier est validé sous 24 à 48h par l'équipe Do You Geckoo, après quoi vous pouvez vous connecter et passer en ligne quand vous le souhaitez, sans horaires imposés.",
  },
  {
    q: "Combien coûte l'inscription pour un commerçant ?",
    a: `L'inscription est gratuite. Do You Geckoo se rémunère uniquement via une commission sur les commandes effectivement livrées, ${PLATFORM_COMMISSION.fromLabel} selon la formule choisie — sans abonnement fixe obligatoire.`,
  },
  {
    q: "Les applications mobiles sont-elles disponibles ?",
    a: "Les applications Client et Livreur sont en cours de finalisation avant leur publication sur l'App Store et Google Play. En attendant, le service est accessible via le site et les espaces web dédiés.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 bg-sable py-16 sm:py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <p className="mb-3 text-center text-sm font-bold uppercase tracking-widest text-golfe-green">Questions fréquentes</p>
        <h2 className="mb-12 text-center font-heading text-2xl font-extrabold text-nuit sm:text-4xl">
          Ce qu'on nous demande le plus
        </h2>

        <div className="space-y-4">
          {FAQS.map((item) => (
            <details key={item.q} className="group rounded-2xl bg-white p-6 shadow-sm open:shadow-md">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-heading text-base font-bold text-nuit">
                {item.q}
                <span className="flex-shrink-0 text-xl text-golfe-green transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-gris">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
