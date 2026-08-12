export function JoinUs() {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-2 sm:px-6">
        <div id="devenir-partenaire" className="scroll-mt-24 rounded-3xl bg-gradient-to-br from-corail to-corail-light p-8 text-white sm:p-10">
          <h3 className="font-heading text-xl font-extrabold sm:text-2xl">Vous êtes commerçant ?</h3>
          <p className="mt-3 text-white/90">
            Rejoignez le réseau GolfeExpress : commissions parmi les plus basses du secteur, mise en ligne rapide,
            visibilité auprès des habitants et vacanciers du Golfe.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-white/90">
            <li>✓ Commission dès 10%, sans engagement</li>
            <li>✓ Tableau de bord commandes en temps réel</li>
            <li>✓ Impression d'étiquette et notifications sonores</li>
          </ul>
          <a
            href="https://golfeexpress0107-pro.vercel.app"
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
            href="https://deploy-livreur.vercel.app"
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
    </section>
  );
}
