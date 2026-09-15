import React from "react";
import { fetchPlatformReviewStats } from "@/lib/publicApi";

/** Icône bouclier + coche -- SVG inline (pas de dépendance à une librairie d'icônes dans apps/www). */
function ShieldCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 flex-shrink-0 sm:h-[34px] sm:w-[34px]">
      <path
        d="M12 2.5L4.5 5.25V11c0 5.25 3.2 9.44 7.5 10.5 4.3-1.06 7.5-5.25 7.5-10.5V5.25L12 2.5z"
        fill="#2ECC71"
      />
      <path d="M8.5 12.2l2.4 2.4 4.6-4.8" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Badge "Avis vérifiés" flottant en bas à gauche -- inspiré de l'emplacement
 * du badge "Avis Vérifiés" de reparmonphone.fr, MAIS avec une différence
 * assumée : reparmonphone.fr affiche le badge d'un service de certification
 * tiers auquel il est abonné, ce que Do You Geckoo n'a pas. Ce badge
 * affiche donc de VRAIES données maison (moyenne + nombre d'avis clients
 * sur l'app elle-même, volet `platform` de Review -- voir GET
 * /api/reviews/platform-stats), pas une certification externe. Ne s'affiche
 * pas tant qu'il n'y a aucun avis, pour ne jamais montrer un badge vide ou
 * trompeur.
 *
 * Mise en page calquée sur la maquette fournie : icône bouclier vert + coche
 * à gauche, "AVIS VÉRIFIÉS" en titre, note + étoiles sur la ligne suivante,
 * nombre d'avis en petit texte gris en dessous.
 *
 * Taille et position responsives (breakpoint sm=640px) : en dessous, le
 * badge prenait trop de place visuelle en bas de l'écran sur mobile (fixe,
 * pensé pour desktop à l'origine) -- réduit via des classes Tailwind
 * (padding/gap/texte/icône plus petits, ancré plus près du bord) plutôt que
 * du JS, ce composant restant un Server Component (pas de media query JS).
 */
export async function VerifiedReviewsBadge() {
  const { average, count } = await fetchPlatformReviewStats();

  if (!average || count === 0) return null;

  const rounded = Math.round(average * 10) / 10;

  return (
    <div className="fixed bottom-3 left-3 z-[400] sm:bottom-5 sm:left-5">
      <div className="flex items-center gap-2 rounded-xl border border-gris-light bg-white px-2.5 py-2 shadow-2xl sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3">
        <ShieldCheckIcon />
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-wide text-nuit sm:text-[11px]">Avis vérifiés</p>
          <div className="mt-0.5 flex items-center gap-1 sm:gap-1.5">
            <span className="text-xs font-extrabold text-nuit sm:text-sm">{rounded.toFixed(1)}</span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className="text-[10px] sm:text-xs"
                  style={{ color: i <= Math.round(rounded) ? "#FF6B35" : "#E5E7EB" }}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
          <p className="mt-0.5 text-[9px] text-gris sm:text-[10px]">
            {count} avis vérifié{count > 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
