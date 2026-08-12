export function AppDownload() {
  return (
    <section id="app-download" className="scroll-mt-20 bg-sable py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="mb-3 text-center text-sm font-bold uppercase tracking-widest text-corail">Sur votre téléphone</p>
        <h2 className="mx-auto max-w-2xl text-center font-heading text-2xl font-extrabold leading-tight text-nuit sm:text-4xl">
          Utilisez GolfeExpress dès maintenant
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-gris">
          En attendant leur arrivée sur l'App Store et Google Play, les applications Client et Livreur sont déjà
          accessibles et pleinement fonctionnelles directement depuis votre navigateur — ajoutez-les à votre écran
          d'accueil pour une expérience proche d'une vraie app.
        </p>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-golfe-green/10 text-2xl">
              🛍️
            </span>
            <h3 className="font-heading text-xl font-extrabold text-nuit">App Client</h3>
            <p className="mt-2 text-sm text-gris">
              Commandez chez vos commerçants préférés et suivez votre livraison en direct sur la carte.
            </p>
            <a
              href="https://deploy-client-gamma.vercel.app"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-golfe-green px-6 py-3 text-sm font-bold text-nuit transition hover:bg-golfe-green-dark hover:text-white"
            >
              Ouvrir l'app Client →
            </a>
            <p className="mt-2 text-[11px] text-gris">Sur l'App Store et Google Play prochainement</p>
          </div>

          <div className="rounded-3xl bg-nuit p-8 text-white shadow-sm">
            <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">
              🛵
            </span>
            <h3 className="font-heading text-xl font-extrabold text-white">App Livreur</h3>
            <p className="mt-2 text-sm text-white/70">
              Passez en ligne quand vous voulez, acceptez des courses proches de vous, suivez vos gains en direct.
            </p>
            <a
              href="https://deploy-livreur.vercel.app"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-golfe-green px-6 py-3 text-sm font-bold text-nuit transition hover:bg-white"
            >
              Ouvrir l'app Livreur →
            </a>
            <p className="mt-2 text-[11px] text-white/50">Sur l'App Store et Google Play prochainement</p>
          </div>
        </div>
      </div>
    </section>
  );
}
