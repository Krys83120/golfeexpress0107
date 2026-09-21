const ANDROID_STEPS = [
  "Ouvrez le lien de l'app (bouton ci-dessus) dans Chrome",
  "Appuyez sur les 3 points en haut à droite",
  "Appuyez sur « Installer l'application » (ou « Ajouter à l'écran d'accueil »)",
  "L'icône apparaît sur votre écran d'accueil, comme une vraie app",
];

const IOS_STEPS = [
  "Ouvrez le lien de l'app (bouton ci-dessus) dans Safari",
  "Appuyez sur l'icône de partage (le carré avec la flèche vers le haut)",
  "Faites défiler et appuyez sur « Sur l'écran d'accueil »",
  "Appuyez sur « Ajouter » en haut à droite",
];

function InstallSteps({ platform, steps }: { platform: string; steps: string[] }) {
  return (
    <div className="rounded-2xl bg-sable p-6">
      <p className="mb-4 font-heading text-sm font-extrabold uppercase tracking-wide text-nuit">{platform}</p>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={step} className="flex items-start gap-3 text-sm text-gris">
            <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-golfe-green text-[11px] font-bold text-nuit">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function AppDownload() {
  return (
    <section id="app-download" className="scroll-mt-20 bg-sable py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="mb-3 text-center text-sm font-bold uppercase tracking-widest text-corail">Sur votre téléphone</p>
        <h2 className="mx-auto max-w-2xl text-center font-heading text-2xl font-extrabold leading-tight text-nuit sm:text-4xl">
          Utilisez Do You Geckoo dès maintenant
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
              href="https://commander.doyougeckoo.fr"
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
              href="https://livreur.doyougeckoo.fr"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-golfe-green px-6 py-3 text-sm font-bold text-nuit transition hover:bg-white"
            >
              Ouvrir l'app Livreur →
            </a>
            <p className="mt-2 text-[11px] text-white/50">Sur l'App Store et Google Play prochainement</p>
          </div>
        </div>

        {/* Explique comment transformer le lien en icône d'app sur l'écran
            d'accueil -- sans ça, "ouvrir l'app" n'aboutit qu'à un onglet de
            navigateur classique et la plupart des gens n'ont pas le réflexe
            d'aller chercher "Installer l'application" dans le menu 3 points
            de Chrome par eux-mêmes. */}
        <div className="mt-6 rounded-3xl bg-white p-8 shadow-sm">
          <h3 className="text-center font-heading text-lg font-extrabold text-nuit">
            Comment l'installer sur votre écran d'accueil ?
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-gris">
            Une fois le lien ouvert, quelques secondes suffisent pour l'ajouter comme une vraie app.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <InstallSteps platform="Android (Chrome)" steps={ANDROID_STEPS} />
            <InstallSteps platform="iPhone (Safari)" steps={IOS_STEPS} />
          </div>
        </div>
      </div>
    </section>
  );
}
