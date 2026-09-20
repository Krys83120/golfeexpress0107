// Gestion du consentement cookies (RGPD/CNIL) — stocké dans un cookie
// dédié, strictement nécessaire lui-même (il ne fait que mémoriser le choix
// de l'utilisateur), distinct de tout cookie de mesure d'audience éventuel.
// Durée de validité : 6 mois, conforme aux recommandations de la CNIL
// (maximum 13 mois) — au-delà, le bandeau de consentement est présenté à
// nouveau.
//
// Portage du mécanisme déjà en place sur apps/www (voir
// apps/www/src/lib/cookieConsent.ts) — même logique, même durée, même nom de
// cookie/évènement, pour que le comportement reste cohérent sur tout
// l'écosystème Do You Geckoo. Uniquement pertinent côté web (voir
// CookieConsent.tsx / SmartlookLoader.tsx de ce dossier, qui ne s'affichent
// que sur Platform.OS === "web") -- sur mobile natif, il n'y a pas de
// cookies à consentir.

export const CONSENT_COOKIE_NAME = "dyg_cookie_consent";
const CONSENT_MAX_AGE_DAYS = 180;

export interface CookieConsentValue {
  /** Cookies strictement nécessaires — toujours actifs, ne se désactivent pas. */
  essential: true;
  /** Cookies de mesure d'audience (Smartlook) — uniquement si l'utilisateur les a explicitement acceptés. */
  analytics: boolean;
  decidedAt: string;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeDays: number) {
  if (typeof document === "undefined") return;
  const maxAge = maxAgeDays * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function getConsent(): CookieConsentValue | null {
  const raw = readCookie(CONSENT_COOKIE_NAME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.analytics !== "boolean") return null;
    return parsed as CookieConsentValue;
  } catch {
    return null;
  }
}

/** Enregistre le choix de l'utilisateur et prévient les scripts déjà chargés du changement. */
export function setConsent(analytics: boolean) {
  const value: CookieConsentValue = { essential: true, analytics, decidedAt: new Date().toISOString() };
  writeCookie(CONSENT_COOKIE_NAME, JSON.stringify(value), CONSENT_MAX_AGE_DAYS);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("dyg-cookie-consent-changed", { detail: value }));
  }
}

/** À appeler avant d'initialiser tout script de mesure d'audience (ex. Smartlook). */
export function hasAnalyticsConsent(): boolean {
  return getConsent()?.analytics === true;
}

export const COOKIE_REOPEN_EVENT = "dyg-open-cookie-preferences";

/** Rouvre le panneau de préférences cookies. */
export function openCookiePreferences() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COOKIE_REOPEN_EVENT));
}
