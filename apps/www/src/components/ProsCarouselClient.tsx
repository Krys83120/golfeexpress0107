"use client";

import React, { useEffect, useState } from "react";
import type { PublicPro } from "@/lib/publicApi";
import { buildProSlug } from "@/lib/publicApi";

function shuffle<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Défilement en boucle infinie en pur CSS (@keyframes "pros-scroll", voir
 * globals.css) — pas de librairie de carrousel, cohérent avec le reste du
 * site vitrine qui n'a aucune dépendance UI externe (voir VerifiedReviewsBadge).
 *
 * L'ordre initial (rendu serveur) reste identique à celui reçu en props pour
 * que l'hydratation ne déclenche pas d'avertissement de mismatch ; le
 * mélange aléatoire n'est appliqué qu'après le montage côté client
 * (useEffect), donc chaque visiteur voit un ordre différent à chaque
 * chargement de page, sans dépendre du cache ISR côté serveur.
 */
export function ProsCarouselClient({ pros }: { pros: PublicPro[] }) {
  const [ordered, setOrdered] = useState(pros);

  useEffect(() => {
    setOrdered(shuffle(pros));
    // Volontairement exécuté une seule fois au montage : on ne veut pas
    // rebattre l'ordre à chaque re-render, seulement une fois par visite.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (ordered.length === 0) return null;

  // Liste dupliquée pour un défilement en boucle sans "saut" visible :
  // l'animation translate de 0 à -50%, donc la moitié dupliquée prend
  // exactement le relais visuel de la première.
  const loopItems = [...ordered, ...ordered];

  return (
    <section className="overflow-hidden bg-sable py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="mb-8 text-center font-heading text-xl font-bold text-nuit sm:text-2xl">
          Nos commerçants partenaires
        </h2>
      </div>

      <div className="group relative">
        {/* Dégradés de bord pour un fondu propre à l'entrée/sortie du défilement */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-sable to-transparent sm:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-sable to-transparent sm:w-24" />

        <div
          className="flex w-max items-start gap-6 [animation:pros-scroll_9s_linear_infinite] group-hover:[animation-play-state:paused]"
        >
          {loopItems.map((pro, i) => (
            <a
              key={`${pro.id}-${i}`}
              href={`/commercants/${buildProSlug(pro)}`}
              className="flex w-44 flex-shrink-0 flex-col items-center gap-2 text-center transition hover:opacity-80"
            >
              <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-2xl border border-gris-light bg-white p-4 shadow-sm">
                {pro.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- logo dynamique par commerçant (URL Supabase Storage)
                  // object-contain (au lieu de object-cover) + padding sur le
                  // conteneur : le logo reste centré et entier dans la
                  // vignette au lieu d'être recadré/rogné sur les bords.
                  <img src={pro.logo} alt={pro.businessName} className="h-full w-full object-contain" />
                ) : (
                  // Pas de logo renseigné par le commerçant : on affiche le
                  // badge Do You Geckoo plutôt qu'un emoji générique, pour
                  // que la vignette reste soignée même sans logo perso.
                  // eslint-disable-next-line @next/next/no-img-element -- asset statique local (public/), pas de bénéfice à next/image ici
                  <img src="/pro-fallback-badge.png" alt="Do You Geckoo" className="h-full w-full object-contain" />
                )}
              </div>
              <p className="line-clamp-2 text-xs font-semibold text-nuit">{pro.businessName}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
