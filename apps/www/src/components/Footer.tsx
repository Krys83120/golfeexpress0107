import { fetchWwwLogoUrl } from "@/lib/brandingApi";

/**
 * Composant serveur volontairement (comme Nav.tsx / JoinUs.tsx) — récupère
 * le logo configurable AVANT le rendu, pour ne jamais afficher l'emoji 🦎
 * quand un logo est réglé depuis Admin > Branding. Ce fichier avait été
 * oublié lors de la mise en place du logo dynamique dans Nav.tsx : le
 * footer gardait l'emoji codé en dur.
 */
export async function Footer() {
  const logoUrl = await fetchWwwLogoUrl();

  return (
    <footer className="bg-nuit py-12 text-white/60 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- logo dynamique (URL Supabase Storage), pas un asset local optimisable par next/image
                <img src={logoUrl} alt="Do You Geckoo" className="h-14 w-14 object-contain" />
              ) : (
                <span className="text-6xl">🦎</span>
              )}
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
              <li><a href="https://commander.doyougeckoo.fr" className="hover:text-white">Espace Client</a></li>
              <li><a href="https://pro.doyougeckoo.fr" className="hover:text-white">Espace Commerçant</a></li>
              <li><a href="https://livreur.doyougeckoo.fr" className="hover:text-white">Espace Livreur</a></li>
              <li><a href="https://admin.doyougeckoo.fr" className="hover:text-white">Espace Admin</a></li>
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
