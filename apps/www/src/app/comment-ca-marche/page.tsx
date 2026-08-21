import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Comment ça marche",
  description:
    "Toutes les fonctionnalités de Do You Geckoo expliquées en détail : pour les clients, les commerçants partenaires et les livreurs partenaires.",
  robots: { index: true, follow: true },
};

interface Feature {
  emoji: string;
  title: string;
  description: string;
}

const CLIENT_FEATURES: Feature[] = [
  {
    emoji: "🔎",
    title: "Découvrir les commerçants du Golfe",
    description:
      "Parcourez les restaurants, boulangeries, primeurs et autres commerces par catégorie. Chaque fiche affiche le statut ouvert/fermé en temps réel, les horaires, la note moyenne Do You Geckoo et — quand elle est disponible — la note Google du commerce.",
  },
  {
    emoji: "🛒",
    title: "Commander en quelques clics",
    description:
      "Ajoutez des produits à votre panier, choisissez leurs options quand elles existent (taille, suppléments, déclinaisons avec supplément de prix), sélectionnez votre adresse de livraison, puis payez en ligne en toute sécurité.",
  },
  {
    emoji: "🗺️",
    title: "Suivre la livraison en temps réel",
    description:
      "Dès qu'un livreur est assigné, suivez sa position sur la carte, étape par étape (commande confirmée, en préparation, en livraison, livrée). À la remise, un code de vérification communiqué au livreur confirme que la commande vous a bien été remise.",
  },
  {
    emoji: "⭐",
    title: "Donner votre avis, comme vous le souhaitez",
    description:
      "Après une commande, notez et commentez séparément le commerçant, le livreur, la plateforme Do You Geckoo, et chaque produit acheté individuellement — sa note s'affichera directement sur sa fiche produit. Vous choisissez librement ce que vous souhaitez évaluer : uniquement le livreur, uniquement un produit, tout à la fois, ou rien du tout.",
  },
  {
    emoji: "🎁",
    title: "Fidélité et parrainage",
    description:
      "Cumulez des points de fidélité à chaque commande et partagez votre code de parrainage personnel avec vos proches.",
  },
  {
    emoji: "💬",
    title: "Support intégré",
    description:
      "Un centre d'aide et un support joignable directement depuis l'application pour toute question sur une commande en cours ou passée.",
  },
];

const PRO_FEATURES: Feature[] = [
  {
    emoji: "🏪",
    title: "Créer votre boutique",
    description:
      "Renseignez votre catalogue (photos, descriptions, catégories, options de produits), vos horaires d'ouverture et vos zones de livraison. Votre fiche est mise en ligne après vérification de votre SIRET et de votre extrait Kbis par notre équipe.",
  },
  {
    emoji: "📦",
    title: "Recevoir et préparer les commandes",
    description:
      "Chaque commande arrive en temps réel dans votre espace Pro, avec impression d'étiquette et un temps de préparation estimé que vous définissez. Un livreur du réseau vient la récupérer dès qu'elle est prête.",
  },
  {
    emoji: "🕒",
    title: "Gérer vos horaires et fermetures",
    description:
      "Définissez vos horaires d'ouverture hebdomadaires et signalez une fermeture exceptionnelle (congés, imprévu) en un clic — le motif est automatiquement affiché aux clients, sans qu'ils puissent commander pendant cette période.",
  },
  {
    emoji: "💳",
    title: "Être payé simplement",
    description:
      "Les paiements de vos commandes sont reversés automatiquement sur votre compte via Stripe Connect, déduction faite de la commission de votre pack partenaire. Vos factures sont consultables à tout moment depuis votre espace.",
  },
  {
    emoji: "📊",
    title: "Choisir votre pack partenaire",
    description:
      "Un pack gratuit sans engagement, et deux packs payants offrant une commission réduite et une visibilité renforcée. Vous changez de pack ou résiliez à tout moment, directement depuis votre espace Pro.",
  },
  {
    emoji: "🌟",
    title: "Gérer votre réputation",
    description:
      "Consultez votre note moyenne Do You Geckoo (avec synchronisation automatique de votre note Google si vous en avez une), lisez les avis de vos clients, et affichez vos réseaux sociaux (Instagram, Facebook, TikTok, site web) sur votre fiche publique.",
  },
];

const RIDER_FEATURES: Feature[] = [
  {
    emoji: "📋",
    title: "Constituer votre dossier",
    description:
      "Pièce d'identité (recto/verso), selfie de vérification (usage strictement interne), et votre photo de profil — celle-ci est obligatoire, car c'est elle qui sera affichée aux clients pendant vos livraisons. Ajoutez ensuite les informations sur votre véhicule, votre assurance et votre statut professionnel.",
  },
  {
    emoji: "✅",
    title: "Validation sous 24 à 48h",
    description:
      "Votre dossier est examiné manuellement par notre équipe. Vous recevez une notification dès qu'il est validé — ou un motif clair si un complément est nécessaire.",
  },
  {
    emoji: "🕒",
    title: "Une liberté totale",
    description:
      "Aucun horaire imposé : vous passez en ligne quand vous le souhaitez, sur les zones que vous choisissez, et vous pouvez refuser une course sans avoir à vous justifier.",
  },
  {
    emoji: "🛵",
    title: "Livrer en toute simplicité",
    description:
      "Recevez les courses disponibles près de vous, laissez-vous guider jusqu'au commerçant puis jusqu'au client, et confirmez la remise avec le code de vérification donné par le client.",
  },
  {
    emoji: "💶",
    title: "Suivre et retirer vos gains",
    description:
      "Le montant de chaque course est visible avant de l'accepter. Vos gains cumulés apparaissent en temps réel dans l'application, avec des retraits flexibles vers votre compte bancaire via Stripe Connect.",
  },
  {
    emoji: "⭐",
    title: "Votre réputation",
    description:
      "Votre note moyenne est visible par notre équipe et affichée — de façon discrète, juste la note — aux clients pendant le suivi de leur commande, sans jamais exposer le détail des avis écrits.",
  },
];

function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <div className="rounded-2xl border border-gris-light p-5">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{feature.emoji}</span>
        <div>
          <h3 className="font-heading text-[15px] font-bold text-nuit">{feature.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-gris">{feature.description}</p>
        </div>
      </div>
    </div>
  );
}

function PersonaSection({
  id,
  emoji,
  title,
  intro,
  features,
  accent,
  ctaLabel,
  ctaHref,
}: {
  id: string;
  emoji: string;
  title: string;
  intro: string;
  features: Feature[];
  accent: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-gris-light py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{emoji}</span>
          <h2 className="font-heading text-2xl font-extrabold text-nuit sm:text-3xl">{title}</h2>
        </div>
        <p className="mt-3 max-w-2xl text-sm text-gris">{intro}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>

        <a
          href={ctaHref}
          className="mt-8 inline-block rounded-full px-7 py-3 text-sm font-bold text-white transition hover:opacity-90"
          style={{ backgroundColor: accent }}
        >
          {ctaLabel}
        </a>
      </div>
    </section>
  );
}

export default function HowItWorksPage() {
  return (
    <>
      <Nav />
      <main className="bg-white">
        <div className="border-b border-gris-light bg-sable py-14 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <p className="text-sm font-bold uppercase tracking-widest text-golfe-green">Le fonctionnement</p>
            <h1 className="mt-3 font-heading text-3xl font-extrabold text-nuit sm:text-4xl">
              Comment marche Do You Geckoo, en détail
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-gris sm:text-base">
              Toutes les fonctionnalités de la plateforme, expliquées pour chaque profil : client, commerçant
              partenaire et livreur partenaire.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm font-semibold">
              <a href="#clients" className="rounded-full bg-golfe-green px-5 py-2.5 text-nuit hover:bg-golfe-green-dark hover:text-white">🛍️ Clients</a>
              <a href="#commercants" className="rounded-full bg-corail px-5 py-2.5 text-white hover:bg-corail-light">🏪 Commerçants</a>
              <a href="#livreurs" className="rounded-full bg-nuit px-5 py-2.5 text-white hover:bg-nuit-light">🛵 Livreurs</a>
            </div>
          </div>
        </div>

        <PersonaSection
          id="clients"
          emoji="🛍️"
          title="Pour les clients"
          intro="Commandez vos commerces préférés du Golfe de Saint-Tropez et suivez votre livraison de bout en bout."
          features={CLIENT_FEATURES}
          accent="#2ECC71"
          ctaLabel="Ouvrir l'espace Client"
          ctaHref="https://commander.doyougeckoo.fr"
        />

        <PersonaSection
          id="commercants"
          emoji="🏪"
          title="Pour les commerçants"
          intro="Vendez en ligne sans changer votre façon de travailler, avec une commission parmi les plus basses du secteur."
          features={PRO_FEATURES}
          accent="#FF6B35"
          ctaLabel="Ouvrir l'espace Commerçant"
          ctaHref="https://pro.doyougeckoo.fr"
        />

        <PersonaSection
          id="livreurs"
          emoji="🛵"
          title="Pour les livreurs"
          intro="Livrez quand vous voulez, où vous voulez, et gardez une part plus juste de chaque course."
          features={RIDER_FEATURES}
          accent="#1A1A2E"
          ctaLabel="Ouvrir l'espace Livreur"
          ctaHref="https://livreur.doyougeckoo.fr"
        />

        <div className="border-t border-gris-light bg-sable py-14 text-center sm:py-16">
          <h2 className="font-heading text-xl font-extrabold text-nuit sm:text-2xl">
            Envie de rejoindre le réseau Do You Geckoo ?
          </h2>
          <Link
            href="/devenir-partenaire"
            className="mt-6 inline-block rounded-full bg-nuit px-7 py-3 text-sm font-bold text-white transition hover:bg-nuit-light"
          >
            Devenir partenaire →
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
