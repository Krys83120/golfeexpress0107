"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { hasAnalyticsConsent } from "@/lib/cookieConsent";
import { trackVisit } from "@/lib/visitTracking";

/**
 * Composant invisible monté une fois dans le layout racine (voir
 * app/layout.tsx, aux côtés de CookieConsent/ContactWidget) — envoie un
 * événement de visite (voir visitTracking.ts) à chaque changement de page,
 * MAIS uniquement si l'utilisateur a explicitement accepté les cookies de
 * mesure d'audience (voir hasAnalyticsConsent() dans lib/cookieConsent.ts).
 *
 * Ecoute aussi l'événement "dyg-cookie-consent-changed" : si le visiteur
 * accepte les cookies en cours de session (après avoir refusé ou ignoré le
 * bandeau), la page courante est trackée immédiatement sans attendre une
 * navigation — sans jamais tracker rétroactivement les pages vues avant
 * l'acceptation, qu'on n'a de toute façon pas mémorisées.
 */
export function VisitTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    function trackIfConsented() {
      if (!hasAnalyticsConsent()) return;
      if (lastTrackedPath.current === pathname) return;
      lastTrackedPath.current = pathname;
      trackVisit(pathname);
    }

    trackIfConsented();
    window.addEventListener("dyg-cookie-consent-changed", trackIfConsented);
    return () => window.removeEventListener("dyg-cookie-consent-changed", trackIfConsented);
  }, [pathname]);

  return null;
}
