/**
 * Service worker minimal -- uniquement pour recevoir et afficher les
 * notifications Web Push "nouvelle commande à préparer" côté Pro (ajout du
 * 22/09/2026, demande de Krys : être notifié même appli complètement
 * fermée). Même fichier exactement que apps/livreur/public/service-worker.js
 * (voir ce fichier pour le raisonnement complet) -- volontairement PAS un
 * service worker de cache/offline complet (hors scope) : aucune gestion de
 * `fetch`, aucun cache des pages -- juste l'écoute de l'événement `push` et
 * l'ouverture de l'app au clic sur la notification. Servi tel quel à la
 * racine (apps/pro/public/ est copié dans dist/ par `vite build`).
 */

self.addEventListener("push", (event) => {
  let payload = { title: "Do You Geckoo", body: "Nouvelle commande disponible." };
  try {
    if (event.data) payload = event.data.json();
  } catch {
    // Si jamais le payload n'est pas du JSON valide, on garde le message par défaut plutôt que de planter.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: payload.url || "/" },
    })
  );
});

// Au clic sur la notification : ramène au premier onglet déjà ouvert de
// l'app s'il en existe un, sinon en ouvre un nouveau -- évite de multiplier
// les onglets pro.doyougeckoo.fr à chaque notification cliquée.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
