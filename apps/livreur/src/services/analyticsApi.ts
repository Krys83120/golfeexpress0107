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
    body: { app: "LIVREUR", sessionId, path: "app_open" },
  }).catch(() => {
    // Silencieux -- voir doc ci-dessus.
  });
}
