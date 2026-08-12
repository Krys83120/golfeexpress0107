export function EconomicsComparison() {
  return (
    <section className="bg-nuit py-16 text-white sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <p className="mb-3 text-center text-sm font-bold uppercase tracking-widest text-corail">
          Pourquoi GolfeExpress existe
        </p>
        <h2 className="mx-auto max-w-3xl text-center font-heading text-2xl font-extrabold leading-tight sm:text-4xl">
          Sur une course à 20 €, où va vraiment l'argent ?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-white/70 sm:text-base">
          Les grandes plateformes prélèvent des commissions qui peuvent atteindre 30% sur les commerçants, et ne
          reversent souvent qu'une part réduite au livreur qui fait le trajet. On a construit GolfeExpress pour
          inverser ce rapport.
        </p>

        <div className="mt-10 grid gap-6 sm:mt-14 sm:grid-cols-2">
          {/* Colonne Uber Eats */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-white/50">Plateforme classique</p>
            <p className="mb-6 font-heading text-xl font-bold text-white/90">Uber Eats & similaires</p>

            <EarningsBar label="Commission plateforme" amountLabel="jusqu'à 30%" widthPct={30} color="#4B5563" />
            <EarningsBar label="Le livreur touche" amountLabel="≈ 4-5 €" widthPct={22} color="#6B7280" />

            <p className="mt-6 text-sm text-white/50">
              Commissions largement documentées dans la presse économique française sur les plateformes de livraison
              à la demande.
            </p>
          </div>

          {/* Colonne GolfeExpress */}
          <div className="rounded-3xl border-2 border-golfe-green bg-golfe-green/[0.08] p-6 sm:p-8">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-golfe-green">Notre modèle</p>
            <p className="mb-6 font-heading text-xl font-bold text-white">GolfeExpress</p>

            <EarningsBar label="Commission plateforme" amountLabel="10 à 15%" widthPct={15} color="#2ECC71" />
            <EarningsBar label="Le livreur touche" amountLabel="≈ 7-8 €" widthPct={38} color="#2ECC71" />

            <p className="mt-6 text-sm text-white/70">
              Le taux exact dépend du forfait du commerçant (voir nos offres) — toujours pensé pour rester
              nettement sous les standards du secteur, sans rogner sur ce que touche le livreur.
            </p>
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-white/60">
          Résultat : des commerçants qui gardent une marge plus saine, des livreurs qui vivent mieux de leur
          activité, et un prix client qui reste comparable — voire meilleur, grâce à des frais de livraison plus
          bas sur les circuits courts du Golfe.
        </p>
      </div>
    </section>
  );
}

function EarningsBar({
  label,
  amountLabel,
  widthPct,
  color,
}: {
  label: string;
  amountLabel: string;
  widthPct: number;
  color: string;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="text-white/70">{label}</span>
        <span className="font-heading font-bold text-white">{amountLabel}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${widthPct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
