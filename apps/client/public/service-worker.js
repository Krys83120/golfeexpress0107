/**
 * Service worker minimal de l'app Client -- sert uniquement à rendre l'app
 * « installable » (pastille « Installer l'appli », voir
 * src/components/InstallAppPrompt.tsx) sur tous les navigateurs Android.
 *
 * Volontairement PAS de cache ni de mode hors-ligne : l'écouteur `fetch`
 * ci-dessous ne répond à rien (pas de `respondWith`), donc chaque requête
 * part normalement sur le réseau, exactement comme sans service worker.
 * Servi tel quel à la racine (apps/client/public/ est copié dans dist/ par
 * `expo export -p web`).
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
