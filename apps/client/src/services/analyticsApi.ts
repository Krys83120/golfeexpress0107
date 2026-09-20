import { apiFetch } from "@/services/apiClient";

// Identifiant unique généré une fois par lancement de l'app (durée de vie du
// process JS) -- pas besoin de le persister : chaque lancement compte comme
// une "visite" (voir la conception "par session" du tracking de visites,
// voir prisma/schema.prisma model AppVisit et POST /api/analytics/visit).
const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let tracked = false;

/**
 * Envoie un événement "app ouverte" pour les statistiques de visites admin
 * (voir Admin > Visites) -- entièrement anonyme, aucune donnée de compte
 * transmise (pas d'auth sur cet appel, voir skipAuth ci-dessous). Appelé une
 * seule fois au montage de App.tsx. "Fire and forget" : ne doit jamais
 * bloquer ni faire planter le démarrage de l'app.
 */
export function trackAppOpen(): void {
  if (tracked) return;
  tracked = true;
  apiFetch("/api/analytics/visit", {
    method: "POST",
    skipAuth: true,
    body: { app: "CLIENT", sessionId, path: "app_open" },
  }).catch(() => {
    // Silencieux -- voir doc ci-dessus.
  });
}

/**
 * Compteur de vues "fiche commerçant" / "fiche produit" (19/09/2026, demande
 * explicite de Krys) -- réutilise EXACTEMENT le même mécanisme que
 * trackAppOpen ci-dessus (même endpoint, même sessionId de session), en plus
 * de lui (jamais à sa place : "app_open" continue de compter une visite par
 * lancement d'app pour Admin > Visites, inchangé). Sert de source aux
 * compteurs de GET /api/pros/me/views (Pro) et GET /api/admin/analytics/pro-views
 * (Admin) qui reconnaissent ces chemins via leur préfixe -- voir leurs
 * commentaires. `path` attendu : `/pro/<proId>` pour l'ouverture d'une fiche
 * commerçant, `/pro/<proId>/product/<productId>` pour l'ouverture d'une
 * fiche produit -- voir ProDetailScreen.tsx pour les deux appels.
 *
 * "Fire and forget" comme trackAppOpen : ne doit jamais bloquer ni faire
 * planter l'app, appelée librement à chaque ouverture (pas de dédoublonnage
 * -- "une vue" = une ouverture, choix explicite de Krys).
 */
export function trackPageView(path: string): void {
  apiFetch("/api/analytics/visit", {
    method: "POST",
    skipAuth: true,
    body: { app: "CLIENT", sessionId, path },
  }).catch(() => {
    // Silencieux -- voir doc ci-dessus.
  });
}
