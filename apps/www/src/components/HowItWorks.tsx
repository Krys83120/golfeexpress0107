import Link from "next/link";

interface Step {
  title: string;
  description: string;
}

const CLIENT_STEPS: Step[] = [
  { title: "Choisissez un commerçant", description: "Restaurants, boulangeries, fleuristes... parcourez les commerces du Golfe près de chez vous." },
  { title: "Commandez en 2 minutes", description: "Ajoutez vos produits au panier, choisissez votre adresse, payez en ligne." },
  { title: "Suivez votre livraison", description: "Voyez votre livreur arriver en temps réel sur la carte, du commerçant jusqu'à votre porte." },
];

const PRO_STEPS: Step[] = [
  { title: "Créez votre boutique", description: "Ajoutez votre menu ou vos produits, vos photos, vos horaires — en quelques minutes." },
  { title: "Recevez les commandes", description: "Chaque commande arrive directement sur votre tablette ou ordinateur, avec impression d'étiquette." },
  { title: "On s'occupe de la livraison", description: "Un livreur du réseau vient récupérer la commande — vous n'avez rien d'autre à gérer." },
];

const RIDER_STEPS: Step[] = [
  { title: "Inscrivez-vous en ligne", description: "Créez votre dossier (pièce d'identité, véhicule, IBAN) — validé sous 24 à 48h." },
  { title: "Passez en ligne quand vous voulez", description: "Aucun horaire imposé. Vous activez votre disponibilité sur l'app quand ça vous arrange." },
  { title: "Livrez et soyez payé", description: "Vos gains sont visibles en temps réel dans l'app, avec retrait vers votre compte quand vous le souhaitez." },
];

function StepColumn({ emoji, title, steps, accent }: { emoji: string; title: string; steps: Step[]; accent: string }) {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <span className="text-3xl">{emoji}</span>
        <h3 className="font-heading text-xl font-extrabold text-nuit">{title}</h3>
      </div>
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
    </div>
  );
}

export function HowItWorks() {
  return (
    <section id="comment-ca-marche" className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="mb-3 text-center text-sm font-bold uppercase tracking-widest text-golfe-green">Le fonctionnement</p>
        <h2 className="mx-auto max-w-2xl text-center font-heading text-2xl font-extrabold leading-tight text-nuit sm:text-4xl">
          Comment ça marche, pour chacun
        </h2>

        <div className="mt-16 grid gap-12 sm:grid-cols-3 sm:gap-8">
          <StepColumn emoji="🛍️" title="Pour un client" steps={CLIENT_STEPS} accent="#2ECC71" />
          <StepColumn emoji="🏪" title="Pour un commerçant" steps={PRO_STEPS} accent="#FF6B35" />
          <StepColumn emoji="🛵" title="Pour un livreur" steps={RIDER_STEPS} accent="#1A1A2E" />
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/comment-ca-marche"
            className="inline-block rounded-full border-2 border-nuit px-6 py-2.5 text-sm font-bold text-nuit transition hover:bg-nuit hover:text-white"
          >
            Voir toutes les fonctionnalités →
          </Link>
        </div>
      </div>
    </section>
  );
}
