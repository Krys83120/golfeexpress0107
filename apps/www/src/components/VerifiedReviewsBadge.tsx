import React from "react";
import { fetchPlatformReviewStats } from "@/lib/publicApi";

/** Icône bouclier + coche -- SVG inline (pas de dépendance à une librairie d'icônes dans apps/www). */
function ShieldCheckIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
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
 */
export async function VerifiedReviewsBadge() {
  const { average, count } = await fetchPlatformReviewStats();

  if (!average || count === 0) return null;

  const rounded = Math.round(average * 10) / 10;

  return (
    <div style={{ position: "fixed", left: 20, bottom: 20, zIndex: 400 }}>
      <div className="flex items-center gap-3 rounded-2xl border border-gris-light bg-white px-4 py-3 shadow-2xl">
        <ShieldCheckIcon />
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-nuit">Avis vérifiés</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="text-sm font-extrabold text-nuit">{rounded.toFixed(1)}</span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} style={{ fontSize: 12, color: i <= Math.round(rounded) ? "#FF6B35" : "#E5E7EB" }}>
                  ★
                </span>
              ))}
            </div>
          </div>
          <p className="mt-0.5 text-[10px] text-gris">
            {count} avis vérifié{count > 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
