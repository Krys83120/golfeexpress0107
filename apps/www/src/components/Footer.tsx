import Link from "next/link";
import { fetchWwwLogoUrl } from "@/lib/brandingApi";
import { fetchPublicServiceCities } from "@/lib/publicApi";
import { CookiePreferencesLink } from "@/components/CookiePreferencesLink";

/**
 * Composant serveur volontairement (comme Nav.tsx / JoinUs.tsx) — récupère
 * le logo configurable AVANT le rendu, pour ne jamais afficher l'emoji 🦎
 * quand un logo est réglé depuis Admin > Branding. Ce fichier avait été
 * oublié lors de la mise en place du logo dynamique dans Nav.tsx : le
 * footer gardait l'emoji codé en dur.
 */
export async function Footer() {
  const [logoUrl, cities] = await Promise.all([fetchWwwLogoUrl(), fetchPublicServiceCities()]);
  // Maillage interne /livraison/[ville] (23/08/2026, mission SEO/GEO) --
  // uniquement les villes réellement indexables ET dotées d'un slug, jamais
  // une liste statique codée en dur qui listerait des communes sans page
  // réelle derrière (voir consigne "ne jamais affirmer une couverture non
  // réelle").
  const indexableCities = cities.filter((c) => c.seoIndexable && c.seoSlug);

  return (
    <footer className="bg-nuit py-12 text-white/60 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <div className="flex items-center">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- logo dynamique (URL Supabase Storage), pas un asset local optimisable par next/image
                // Taille x6 par rapport à l'originale (h-14/w-14 = 56px, puis x3 puis encore x2 sur demandes successives).
                // Le libellé "Do You Geckoo" à côté a été retiré : le logo contient déjà le nom, à cette taille il se suffit à lui-même.
                <img src={logoUrl} alt="Do You Geckoo" className="h-auto w-[403px] object-contain" />
              ) : (
                <span className="text-[360px] leading-none">🦎</span>
              )}
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
            </ul>
          </div>

          <div>
            <p className="notranslate mb-4 text-xs font-bold uppercase tracking-wide text-white/40" translate="no">Do You Geckoo</p>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/a-propos" className="hover:text-white">À propos</Link></li>
              <li><Link href="/notre-modele" className="hover:text-white">Notre modèle économique</Link></li>
              <li><Link href="/comment-ca-marche" className="hover:text-white">Comment ça marche</Link></li>
              <li><Link href="/devenir-partenaire" className="hover:text-white">Devenir partenaire</Link></li>
              <li><Link href="/devenir-livreur" className="hover:text-white">Devenir livreur</Link></li>
              <li><Link href="/conditions-generales" className="hover:text-white">Conditions générales</Link></li>
              <li><Link href="/confidentialite" className="hover:text-white">Confidentialité</Link></li>
              <li><CookiePreferencesLink /></li>
            </ul>
          </div>

          {indexableCities.length > 0 && (
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-wide text-white/40">Livraison par ville</p>
              <ul className="space-y-2.5 text-sm">
                {indexableCities.map((city) => (
                  <li key={city.id}>
                    <Link href={`/livraison/${city.seoSlug}`} className="hover:text-white">
                      Livraison {city.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs sm:flex-row">
          <p>© {new Date().getFullYear()} Do You Geckoo — Sainte-Maxime, Golfe de Saint-Tropez</p>
          <p>Fait avec ♥️ dans le Golfe de Saint-Tropez</p>
        </div>
      </div>
    </footer>
  );
}
