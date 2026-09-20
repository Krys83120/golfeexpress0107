import { useEffect } from "react";
import { Platform } from "react-native";
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
    } as NonNullable<Window["smartlook"]>);
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
 * Charge Smartlook (enregistrement de session) UNIQUEMENT sur le web
 * (Platform.OS === "web" -- inutile et sans effet sur l'app mobile native)
 * ET uniquement si l'utilisateur a donné son consentement "Mesure
 * d'audience" (voir cookieConsent.ts / CookieConsent.tsx). Même projet
 * Smartlook que sur apps/www/pro/livreur -- Smartlook relie automatiquement
 * les sessions entre sous-domaines d'un même domaine racine.
 */
export function SmartlookLoader() {
  useEffect(() => {
    if (Platform.OS !== "web") return;

    if (hasAnalyticsConsent()) {
      loadSmartlook();
    }

    function handleConsentChange(e: Event) {
      const detail = (e as CustomEvent<{ analytics?: boolean }>).detail;
      if (detail?.analytics) {
        loadSmartlook();
      }
    }
    window.addEventListener("dyg-cookie-consent-changed", handleConsentChange);
    return () => window.removeEventListener("dyg-cookie-consent-changed", handleConsentChange);
  }, []);

  return null;
}
