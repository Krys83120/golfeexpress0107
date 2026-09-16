"use client";

import { useEffect } from "react";
import { hasAnalyticsConsent } from "@/lib/cookieConsent";

const SMARTLOOK_PROJECT_KEY = "04c0bc12eb110edbd262abfc5e79b7ca85279c79";

declare global {
  interface Window {
    smartlook?: ((...args: unknown[]) => void) & { api?: unknown[] };
  }
}

function loadSmartlook() {
  if (typeof window === "undefined" || window.smartlook) return;

  (function (d: Document) {
    const o = (window.smartlook = function (...args: unknown[]) {
      o.api!.push(args);
    });
    o.api = [];
    const h = d.getElementsByTagName("head")[0];
    const c = d.createElement("script");
    c.async = true;
    c.type = "text/javascript";
    c.charset = "utf-8";
    c.src = "https://web-sdk.smartlook.com/recorder.js";
    h.appendChild(c);
  })(document);

  window.smartlook!("init", SMARTLOOK_PROJECT_KEY, { region: "eu" });
}

/**
 * Charge Smartlook (enregistrement de session) UNIQUEMENT si le visiteur a
 * donné son consentement "Mesure d'audience" (voir cookieConsent.ts /
 * CookieConsent.tsx) -- jamais au chargement de la page par défaut, puisque
 * Smartlook dépose des cookies non essentiels (voir sa documentation sur les
 * cookies). Réagit aussi en direct à un changement de préférence (bandeau
 * rouvert via "Gérer les cookies" du footer) sans nécessiter de recharger la
 * page -- c'est exactement le mécanisme prévu par hasAnalyticsConsent() /
 * l'évènement "dyg-cookie-consent-changed", en place depuis la mise en place
 * du bandeau RGPD mais jamais encore utilisé faute d'outil de mesure
 * d'audience installé jusqu'ici.
 *
 * Un même projet Smartlook (même clé) est également installé sur les apps
 * Commander/Pro/Livreur -- Smartlook relie automatiquement les sessions
 * entre sous-domaines d'un même domaine racine, voir sa doc sur les cookies
 * cross-domaine.
 */
export function SmartlookLoader() {
  useEffect(() => {
    if (hasAnalyticsConsent()) {
      loadSmartlook();
    }

    function handleConsentChange(e: Event) {
      const detail = (e as CustomEvent<{ analytics?: boolean }>).detail;
      if (detail?.analytics) {
        loadSmartlook();
      }
      // Remarque : si le visiteur retire son consentement après l'avoir déjà
      // donné, on ne peut pas "décharger" un script déjà exécuté côté
      // navigateur -- seul un rechargement de page évite qu'il se recharge.
      // Comportement standard pour ce type de script (cohérent avec la
      // plupart des CMP), rien à faire de plus ici.
    }
    window.addEventListener("dyg-cookie-consent-changed", handleConsentChange);
    return () => window.removeEventListener("dyg-cookie-consent-changed", handleConsentChange);
  }, []);

  return null;
}
