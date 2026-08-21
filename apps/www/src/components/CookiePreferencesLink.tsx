"use client";

import { openCookiePreferences } from "@/lib/cookieConsent";

/**
 * Bouton (pas un <a>) car il ne navigue nulle part — il rouvre le panneau
 * de préférences cookies déjà monté dans le layout. Composant client séparé
 * du Footer (server component) pour rester cohérent avec le pattern déjà
 * utilisé pour Nav/NavClient.
 */
export function CookiePreferencesLink() {
  return (
    <button type="button" onClick={openCookiePreferences} className="text-left hover:text-white">
      Gérer les cookies
    </button>
  );
}
