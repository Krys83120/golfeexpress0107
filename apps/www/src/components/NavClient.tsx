"use client";

import React, { useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Comment ça marche", href: "/comment-ca-marche" },
  { label: "Nos commerçants", href: "/commercants" },
  { label: "Colis Express", href: "/colis-express" },
  { label: "Devenir livreur", href: "/devenir-livreur" },
  { label: "Devenir partenaire", href: "/devenir-partenaire" },
];

// Jaune exact du logo/mascotte Do You Geckoo (échantillonné sur
// assets/splash-badge.png) — utilisé pour le bouton "Devenir Partenaire"
// afin qu'il reprenne la même teinte que le logo plutôt qu'un jaune générique.
const PARTNER_YELLOW = "#FEB903";

export function NavClient({ logoUrl }: { logoUrl: string | null }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function closeAll() {
    setMobileMenuOpen(false);
  }

  return (
    <>
      {/* Bannière logo — défile normalement avec la page (PAS sticky),
          contrairement à la barre de nav juste en dessous. Volontairement
          séparée : mettre un logo aussi grand dans un élément sticky
          occuperait une part énorme de l'écran en permanence au scroll. */}
      <div className="border-b border-white/10 bg-nuit">
        <div className="mx-auto flex max-w-7xl justify-center px-4 py-3 sm:px-6">
          <Link href="/" onClick={closeAll} aria-label="Do You Geckoo — accueil">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- logo dynamique (URL Supabase Storage), pas un asset local optimisable par next/image
              // Le logo contient déjà le nom "Do You Geckoo" intégré
              // visuellement (voir Admin > Branding) — pas de texte séparé
              // à côté. Pleine largeur sur mobile, taille fixe généreuse
              // à partir de sm.
              <img
                src={logoUrl}
                alt="Do You Geckoo"
                className="h-auto w-full max-w-[720px] object-contain sm:max-w-[780px]"
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-6xl">🦎</span>
                <span className="notranslate font-heading text-base font-extrabold text-white sm:text-lg" translate="no">Do You Geckoo</span>
              </div>
            )}
          </Link>
        </div>
      </div>

      {/* Barre de navigation fine — reste collée en haut au défilement. */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-nuit/95 backdrop-blur">
        <div className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* lg:w-max est indispensable ici, pas cosmétique : sans lui, un
            <nav> en position absolute avec seulement "left" défini (pas
            "right") se voit attribuer par le navigateur une largeur
            "shrink-to-fit" calculée à partir de la moitié DROITE du
            conteneur parent (soit 50% de sa largeur), même si le
            translate-x-1/2 le recentre visuellement ensuite. Résultat
            constaté en prod : les liens se retrouvaient compressés dans un
            budget ~640px au lieu des ~700px nécessaires, et chaque libellé
            de 2 mots retombait à la ligne ("Comment ça" / "marche"), ce qui
            rendait le menu illisible malgré un texte blanc correct sur fond
            nuit (bug rapporté par Krys le 19/09/2026, diagnostiqué en
            direct sur doyougeckoo.fr). lg:w-max force la largeur réelle du
            contenu et supprime ce repli à la ligne. whitespace-nowrap sur
            chaque lien est une sécurité supplémentaire dans le même but. */}
        <nav className="hidden items-center gap-8 lg:absolute lg:left-1/2 lg:flex lg:w-max lg:-translate-x-1/2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap text-sm font-semibold text-white/90 transition hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* "Devenir Partenaire" — bouton dédié à GAUCHE, uniquement sur
            mobile/tablette (lg:hidden). C'est un item flex séparé (pas
            imbriqué dans le groupe de droite ci-dessous) : avec la nav
            horizontale masquée sur mobile, ce bouton et le groupe de droite
            (hamburger) sont les deux seuls enfants visibles du conteneur
            "justify-between" parent, qui les répartit donc naturellement
            chacun à une extrémité. À partir de lg, ce bouton disparaît car
            le lien équivalent est déjà dans la nav horizontale. */}
        <Link
          href="/devenir-partenaire"
          onClick={closeAll}
          className="whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold text-nuit transition hover:opacity-90 sm:px-5 sm:py-2.5 sm:text-sm lg:hidden"
          style={{ backgroundColor: PARTNER_YELLOW }}
        >
          Devenir Partenaire
        </Link>

        <div className="flex items-center gap-2">
          {/* Bouton hamburger — visible uniquement en dessous du breakpoint lg où la nav horizontale disparaît */}
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white lg:hidden"
            aria-expanded={mobileMenuOpen}
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                <path d="M0 1H16M0 6H16M0 11H16" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Menu mobile déroulant */}
      {mobileMenuOpen && (
        <nav className="border-t border-white/10 bg-nuit px-4 py-3 lg:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeAll}
              className="block rounded-lg px-3 py-3 text-sm font-medium text-white/85 hover:bg-white/5"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
      </header>
    </>
  );
}
