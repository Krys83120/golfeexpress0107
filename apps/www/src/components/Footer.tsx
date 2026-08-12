export function Footer() {
  return (
    <footer className="bg-nuit py-12 text-white/60 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2">
              <span className="text-6xl">🦎</span>
              <span className="notranslate font-heading text-lg font-extrabold text-white" translate="no">Do You Geckoo</span>
            </div>
            <p className="mt-4 max-w-sm text-sm">
              La livraison locale du Golfe de Saint-Tropez. Créée pour que les commerçants gardent plus de marge et
              que les livreurs soient mieux payés — sans rien changer au prix pour le client.
            </p>
          </div>

          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-wide text-white/40">Accès direct</p>
            <ul className="space-y-2.5 text-sm">
              <li><a href="https://deploy-client-gamma.vercel.app" className="hover:text-white">Espace Client</a></li>
              <li><a href="https://golfeexpress0107-pro.vercel.app" className="hover:text-white">Espace Commerçant</a></li>
              <li><a href="https://deploy-livreur.vercel.app" className="hover:text-white">Espace Livreur</a></li>
              <li><a href="https://golfeexpress0107-admin.vercel.app" className="hover:text-white">Espace Admin</a></li>
            </ul>
          </div>

          <div>
            <p className="notranslate mb-4 text-xs font-bold uppercase tracking-wide text-white/40" translate="no">Do You Geckoo</p>
            <ul className="space-y-2.5 text-sm">
              <li><a href="/#comment-ca-marche" className="hover:text-white">Comment ça marche</a></li>
              <li><a href="/#devenir-partenaire" className="hover:text-white">Devenir partenaire</a></li>
              <li><a href="#" className="hover:text-white">Conditions générales</a></li>
              <li><a href="#" className="hover:text-white">Confidentialité</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs sm:flex-row">
          <p>© {new Date().getFullYear()} Do You Geckoo — Sainte-Maxime, Golfe de Saint-Tropez</p>
          <p>Fait avec 🦎 sur la Côte d'Azur</p>
        </div>
      </div>
    </footer>
  );
}
