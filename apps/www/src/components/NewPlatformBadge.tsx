import React from "react";

/**
 * Badge "Nouveau" flottant en haut à gauche, visible sur tout le site
 * (rendu depuis RootLayout, voir app/layout.tsx) -- demande de Krys du
 * 03/10/2026 : certaines villes/catégories ont encore peu de commerçants
 * ou de livreurs inscrits, et un visiteur qui tombe sur une liste
 * clairsemée (/commercants, /decouvrir/[ville], /livraison/[ville],
 * /devenir-livreur...) risque de penser que la plateforme est à l'abandon
 * plutôt que toute récente.
 *
 * Volontairement PAS un ruban rouge en diagonale (codage visuel "soldes
 * e-commerce", évoque une promo plutôt qu'un lancement) ni une date figée
 * genre "Fin 2026" (deviendrait faux/confus dans quelques mois, et un badge
 * "Nouveauté" daté qu'on voit encore l'année suivante produit l'effet
 * inverse de celui recherché) -- juste un texte évergreen, à laisser tel
 * quel jusqu'à ce que l'offre soit plus dense dans la zone concernée, puis
 * à retirer simplement ici (une seule ligne dans RootLayout).
 *
 * `fixed` (comme VerifiedReviewsBadge.tsx, même pattern) plutôt que placé
 * dans la bannière logo de NavClient.tsx : celle-ci défile normalement avec
 * la page (voir son commentaire "PAS sticky"), alors que ce badge doit
 * justement rester visible en permanence, y compris pendant qu'un visiteur
 * fait défiler une page de listing peu remplie.
 */
export function NewPlatformBadge() {
  return (
    <div className="fixed left-3 top-3 z-[400] sm:left-5 sm:top-5">
      <div className="flex items-center gap-1.5 rounded-full bg-corail px-3 py-1.5 text-xs font-bold text-white shadow-2xl sm:px-4 sm:py-2 sm:text-sm">
        <span aria-hidden="true">🆕</span>
        <span className="sm:hidden">Nouveau</span>
        <span className="hidden sm:inline">Nouveau sur le Golfe de Saint-Tropez</span>
      </div>
    </div>
  );
}
