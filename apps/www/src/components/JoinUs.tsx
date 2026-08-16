import { fetchPublicPartnerPacks } from "@/lib/publicApi";

const TIER_ORDER = ["FREE", "PREMIUM", "PREMIUM_PLUS"];

/**
 * Composant serveur volontairement (comme Nav.tsx) — récupère les packs
 * partenaires réels côté serveur avant le premier rendu, pour que le site
 * vitrine n'affiche jamais un prix/avantage périmé ou codé en dur. Les prix
 * viennent de la même source que l'écran d'abonnement apps/pro
 * (GET /api/partner-packs, configurable depuis Admin > Packs Partenaires).
 */
export async function JoinUs() {
  const rawPacks = await fetchPublicPartnerPacks();
  const packs = TIER_ORDER.map((tier) => rawPacks.find((p) => p.tier === tier)).filter(
    (p): p is NonNullable<typeof p> => Boolean(p)
  );

  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-2 sm:px-6">
        <div id="devenir-partenaire" className="scroll-mt-24 rounded-3xl bg-gradient-to-br from-corail to-corail-light p-8 text-white sm:p-10">
          <h3 className="font-heading text-xl font-extrabold sm:text-2xl">Vous êtes commerçant ?</h3>
          <p className="mt-3 text-white/90">
            Rejoignez le réseau Do You Geckoo : commissions parmi les plus basses du secteur, mise en ligne rapide,
            visibilité auprès des habitants et vacanciers du Golfe.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-white/90">
            <li>✓ Commission dès 7%, sans engagement</li>
            <li>✓ Tableau de bord commandes en temps réel</li>
            <li>✓ Impression d'étiquette et notifications sonores</li>
          </ul>
          <a
            href="https://pro.doyougeckoo.fr"
            className="mt-8 inline-block rounded-full bg-white px-7 py-3 text-sm font-bold text-corail transition hover:bg-nuit hover:text-white"
          >
            Devenir partenaire
          </a>
        </div>

        <div id="devenir-livreur" className="scroll-mt-24 rounded-3xl bg-nuit p-8 text-white sm:p-10">
          <h3 className="font-heading text-xl font-extrabold sm:text-2xl">Vous voulez livrer ?</h3>
          <p className="mt-3 text-white/80">
            Scooter, vélo ou voiture : livrez quand vous voulez, sur les zones que vous choisissez, et gardez une
            part plus juste de chaque course.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-white/80">
            <li>✓ Aucun horaire imposé</li>
            <li>✓ Jusqu'à 40% de gains en plus qu'ailleurs*</li>
            <li>✓ Retraits de gains flexibles</li>
          </ul>
          <a
            href="https://livreur.doyougeckoo.fr"
            className="mt-8 inline-block rounded-full bg-golfe-green px-7 py-3 text-sm font-bold text-nuit transition hover:bg-white"
          >
            Devenir livreur
          </a>
          <p className="mt-3 text-[11px] text-white/40">
            *Estimation comparée aux commissions moyennes constatées sur les plateformes de livraison classiques,
            selon le type de course.
          </p>
        </div>
      </div>

      {packs.length > 0 && (
        <div className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
          <h3 className="text-center font-heading text-xl font-extrabold text-nuit sm:text-2xl">
            Nos packs partenaires
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-gris">
            Un pack gratuit sans engagement, deux packs payants avec commission réduite et visibilité renforcée.
            Souscription et gestion en ligne, directement depuis votre espace Pro.
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
            Les prix affichés sont TTC. Vous pouvez changer de pack ou résilier à tout moment depuis votre espace Pro
            — sans engagement.
          </p>
        </div>
      )}
    </section>
  );
}
