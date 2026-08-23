// Tracking de visites anonyme du site vitrine — voir prisma/schema.prisma
// model AppVisit et POST /api/analytics/visit pour le détail complet.
//
// IMPORTANT : ce module ne doit être appelé qu'après vérification de
// hasAnalyticsConsent() (voir apps/www/src/lib/cookieConsent.ts) — c'est la
// responsabilité de l'appelant (voir VisitTracker.tsx), ce fichier ne
// vérifie rien lui-même pour rester un simple utilitaire réseau.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const SESSION_STORAGE_KEY = "dyg_visit_session_id";

function generateSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Un identifiant aléatoire par onglet/session de navigation (sessionStorage
 * — se réinitialise à la fermeture de l'onglet), jamais lié à un compte.
 * C'est ce qui permet de compter "une visite = une ouverture du site" (voir
 * la réponse "par session" donnée lors de la conception de cette
 * fonctionnalité) même si le visiteur navigue sur plusieurs pages.
 */
function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const created = generateSessionId();
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    // sessionStorage indisponible (navigation privée stricte...) -- repli
    // sur un identifiant non persistant plutôt que de ne rien tracker :
    // chaque page vue compte alors comme une nouvelle "visite", compromis
    // acceptable et rare en pratique.
    return generateSessionId();
  }
}

/**
 * Envoie un événement de visite pour la page courante. "Fire and forget" —
 * une erreur réseau ne doit jamais perturber la navigation du visiteur ni
 * remonter d'exception à l'appelant.
 */
export function trackVisit(path: string): void {
  const sessionId = getOrCreateSessionId();
  if (!sessionId) return;

  fetch(`${API_URL}/api/analytics/visit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app: "WWW",
      sessionId,
      path,
      referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
    }),
    keepalive: true,
  }).catch(() => {
    // Silencieux — voir doc ci-dessus.
  });
}
