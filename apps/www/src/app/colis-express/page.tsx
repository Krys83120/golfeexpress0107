import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { buildMetadata, SITE_URL } from "@/lib/seo";

/**
 * Page vitrine "Colis Express" (19/09/2026, suite au retour de Krys après la
 * mise en ligne du paiement). Explique le service aux visiteurs intéressés,
 * avec SEO (buildMetadata, FAQPage/Service JSON-LD, entrée sitemap.ts) et
 * GEO (zone géographique explicite dans le JSON-LD Service, mêmes
 * conventions que /livraison/[ville] et le layout racine).
 *
 * IMPORTANT -- Colis Express est un service RÉSERVÉ aux commerçants
 * partenaires (voir apps/api/.../parcel-orders/route.ts, requireProOrEmployee
 * : seul un compte Pro/employé peut créer une demande). Cette page ne doit
 * donc JAMAIS laisser penser qu'un client particulier peut commander un
 * coursier lui-même -- ce n'est pas le cas aujourd'hui. Le CTA principal
 * dirige vers l'espace Commerçant (compte existant) ou "Devenir partenaire"
 * (pas encore de compte), jamais vers l'espace Client.
 *
 * Aucun tarif chiffré n'est affiché : le montant dépend de la distance et
 * de réglages pilotables depuis Admin > Tarification (voir
 * apps/api/src/lib/pricingSettings.ts), donc potentiellement différents de
 * ce qui serait écrit ici en dur -- même discipline que le reste du site
 * vitrine (voir lib/economics.ts : jamais un chiffre non sourcé/non à jour).
 */
export const metadata: Metadata = buildMetadata({
  title: "Colis Express",
  description:
    "Colis Express : le service de coursier à la demande de Do You Geckoo pour les commerçants du Golfe de Saint-Tropez. Envoyez un colis avec votre réseau de livreurs habituel, payé à la course, sans abonnement.",
  path: "/colis-express",
});

interface Step {
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    title: "Renseignez le destinataire",
    description:
      "Nom, téléphone et adresse de livraison, directement depuis votre espace Commerçant — pas besoin que le destinataire ait de compte Do You Geckoo.",
  },
  {
    title: "Payez par carte",
    description:
      "Le tarif est calculé automatiquement selon la distance et affiché avant de valider. Aucun abonnement : vous réglez uniquement les demandes que vous effectuez, carte ressaisie à chaque fois.",
  },
  {
    title: "Un livreur récupère le colis",
    description: "Le même réseau de livreurs indépendants qui assure déjà la livraison de vos commandes.",
  },
  {
    title: "Suivi jusqu'à la remise",
    description:
      "Statut de la course visible en temps réel depuis votre espace Commerçant. Modifiable tant qu'aucun livreur n'est assigné, annulable (remboursement automatique si déjà payée) tant que le colis n'a pas été récupéré.",
  },
];

const USE_CASES: string[] = [
  "Un client a oublié un article en boutique — faites-le-lui livrer sans qu'il ait à repasser.",
  "Un document ou un échantillon à transmettre rapidement à un autre professionnel du Golfe.",
  "Un échange de marchandises entre deux commerces du réseau.",
  "Un retour fournisseur ou une pièce à faire parvenir en dehors de vos tournées de livraison habituelles.",
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Qui peut utiliser Colis Express ?",
    a: "Colis Express est réservé aux commerçants partenaires de Do You Geckoo, depuis leur espace Commerçant. Ce n'est pas (encore) un service accessible directement aux clients particuliers.",
  },
  {
    q: "Combien ça coûte ?",
    a: "Le tarif est calculé automatiquement selon la distance entre l'enlèvement et la livraison, et affiché avant de valider le paiement. Il n'y a aucun abonnement : vous payez uniquement les demandes que vous effectuez, à la course.",
  },
  {
    q: "Quels formats de colis sont acceptés ?",
    a: "Les petits et moyens colis transportables par un livreur en scooter, vélo ou véhicule léger — d'une enveloppe à un carton standard. Les colis volumineux ou lourds ne sont pas encore pris en charge.",
  },
  {
    q: "Qui livre mon colis ?",
    a: "Le même réseau de livreurs indépendants que pour vos commandes classiques — aucun prestataire externe.",
  },
  {
    q: "Puis-je suivre, modifier ou annuler ma demande ?",
    a: "Oui, depuis votre espace Commerçant : consultez le détail et le statut en temps réel, modifiez le destinataire ou l'adresse tant qu'aucun livreur n'est assigné, ou annulez la demande (remboursement automatique si déjà payée) tant que le colis n'a pas encore été récupéré.",
  },
];

const pageUrl = `${SITE_URL}/colis-express`;

// Service distinct (JSON-LD propre à cette page, lié à l'Organization du
// layout racine par @id) -- même structure que /livraison/[ville], zone
// géographique alignée sur le Service générique du layout (Sainte-Maxime +
// Golfe de Saint-Tropez), jamais une couverture plus large non réelle.
const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${pageUrl}#service`,
  name: "Colis Express",
  serviceType: "Service de coursier à la demande pour commerçants",
  description:
    "Envoi de colis à la demande pour les commerçants partenaires de Do You Geckoo, assuré par leur réseau de livreurs habituel, payé à la course.",
  provider: { "@id": `${SITE_URL}/#organization` },
  audience: { "@type": "BusinessAudience", audienceType: "Commerçants partenaires Do You Geckoo" },
  areaServed: [
    { "@type": "City", name: "Sainte-Maxime", containedInPlace: { "@type": "Place", name: "Golfe de Saint-Tropez" } },
    { "@type": "Place", name: "Golfe de Saint-Tropez" },
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Colis Express", item: pageUrl },
  ],
};

export default function ColisExpressPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Nav />
      <main className="bg-white">
        <div className="border-b border-gris-light bg-sable py-14 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <p className="text-sm font-bold uppercase tracking-widest text-corail">Service commerçants</p>
            <h1 className="mt-3 font-heading text-3xl font-extrabold text-nuit sm:text-4xl">📦 Colis Express</h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-gris sm:text-base">
              Un coursier de votre réseau Do You Geckoo habituel, disponible en quelques clics pour livrer un colis,
              un document ou un oubli client — dans le Golfe de Saint-Tropez, payé à la course, sans abonnement.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm font-semibold">
              <a
                href="https://pro.doyougeckoo.fr"
                className="rounded-full bg-corail px-5 py-2.5 text-white transition hover:bg-corail-light"
              >
                Ouvrir l'espace Commerçant →
              </a>
              <Link
                href="/devenir-partenaire"
                className="rounded-full border-2 border-nuit px-5 py-2.5 text-nuit transition hover:bg-nuit hover:text-white"
              >
                Pas encore partenaire ?
              </Link>
            </div>
            <p className="mx-auto mt-5 max-w-xl text-xs text-gris">
              Réservé aux commerçants partenaires de Do You Geckoo, depuis leur espace Commerçant.
            </p>
          </div>
        </div>

        {/* COMMENT ÇA MARCHE */}
        <section className="border-t border-gris-light py-14 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="font-heading text-2xl font-extrabold text-nuit sm:text-3xl">Comment ça marche</h2>
            <div className="mt-10">
              <ol className="space-y-6 sm:grid sm:grid-cols-2 sm:gap-x-10 sm:gap-y-8 sm:space-y-0">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-corail font-heading text-sm font-bold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-bold text-nuit">{step.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-gris">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* GABARITS */}
        <section className="border-t border-gris-light bg-sable py-14 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="font-heading text-2xl font-extrabold text-nuit sm:text-3xl">Quels colis ?</h2>
            <p className="mt-3 max-w-2xl text-sm text-gris">
              Deux gabarits pour l'instant, transportables par un livreur en scooter, vélo ou véhicule léger.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-gris-light bg-white p-5">
                <p className="font-heading text-lg font-bold text-nuit">S — petit colis</p>
                <p className="mt-1.5 text-sm text-gris">Enveloppe, boîte à chaussures, petit sac.</p>
              </div>
              <div className="rounded-2xl border border-gris-light bg-white p-5">
                <p className="font-heading text-lg font-bold text-nuit">M — colis moyen</p>
                <p className="mt-1.5 text-sm text-gris">Carton standard, sac de taille moyenne.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CAS D'USAGE */}
        <section className="border-t border-gris-light py-14 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="font-heading text-2xl font-extrabold text-nuit sm:text-3xl">Quelques exemples d'usage</h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {USE_CASES.map((useCase) => (
                <li key={useCase} className="flex gap-3 rounded-2xl border border-gris-light p-5">
                  <span className="text-corail">→</span>
                  <span className="text-sm leading-relaxed text-nuit">{useCase}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-gris-light bg-sable py-14 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-center font-heading text-2xl font-extrabold text-nuit sm:text-3xl">
              Questions fréquentes
            </h2>
            <div className="mt-10 space-y-4">
              {FAQ.map((item) => (
                <details key={item.q} className="group rounded-2xl bg-white p-6 shadow-sm open:shadow-md">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-heading text-base font-bold text-nuit">
                    {item.q}
                    <span className="flex-shrink-0 text-xl text-corail transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-gris">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="border-t border-gris-light bg-nuit py-14 text-center text-white sm:py-20">
          <div className="mx-auto max-w-xl px-4 sm:px-6">
            <span className="text-3xl">📦</span>
            <h2 className="mt-3 font-heading text-2xl font-extrabold sm:text-3xl">
              Prêt à envoyer votre premier colis ?
            </h2>
            <p className="mt-3 text-sm text-white/80">
              Depuis votre espace Commerçant, Colis Express est accessible en un clic dans le menu.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm font-semibold">
              <a
                href="https://pro.doyougeckoo.fr"
                className="rounded-full bg-corail px-7 py-3 text-white transition hover:bg-corail-light"
              >
                Ouvrir l'espace Commerçant →
              </a>
              <Link
                href="/devenir-partenaire"
                className="rounded-full bg-golfe-green px-7 py-3 text-nuit transition hover:bg-white"
              >
                Devenir partenaire →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
