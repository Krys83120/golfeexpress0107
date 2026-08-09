import { useEffect, useRef } from "react";
import { OrderStatus, type Order } from "@golfeexpress/types";
import { useProOrdersStore } from "@/store/useProOrdersStore";
import { useNotificationSettingsStore } from "@/store/useNotificationSettingsStore";
import { printOrderLabel } from "@/services/printLabel";

/**
 * Surveille les commandes du Pro et, dès qu'une NOUVELLE commande PENDING
 * apparaît (comparaison des ids vus au tour de polling précédent) :
 * - joue le son de notification choisi (voir NotificationsPage)
 * - imprime automatiquement son étiquette si ce réglage est activé
 *
 * Placé une seule fois au niveau racine de l'app (MainApp) pour continuer à
 * détecter les nouvelles commandes même quand la page Commandes n'est pas
 * affichée (le Pro peut être sur Menu ou Finances quand une commande arrive).
 */
export function useNewOrderNotifications() {
  const orders = useProOrdersStore((s) => s.orders);
  const playSelectedSound = useNotificationSettingsStore((s) => s.playSelectedSound);
  const autoPrint = useNotificationSettingsStore((s) => s.autoPrint);
  const knownPendingIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    const pendingOrders = orders.filter((o) => o.status === OrderStatus.PENDING);
    const currentPendingIds = new Set(pendingOrders.map((o) => o.id));

    // Premier passage (juste après le chargement initial) : on mémorise
    // l'état de départ sans rien déclencher, pour ne pas notifier/imprimer
    // bruyamment toutes les commandes déjà en attente à l'ouverture du
    // dashboard (ex: après un rechargement de page).
    if (knownPendingIds.current === null) {
      knownPendingIds.current = currentPendingIds;
      return;
    }

    const newOrders: Order[] = pendingOrders.filter((o) => !knownPendingIds.current!.has(o.id));
    if (newOrders.length > 0) {
      playSelectedSound();
      if (autoPrint) {
        // Un léger délai entre chaque impression évite que plusieurs
        // fenêtres d'impression s'ouvrent exactement en même temps si
        // plusieurs commandes arrivent dans le même cycle de rafraîchissement.
        newOrders.forEach((order, index) => {
          setTimeout(() => printOrderLabel(order), index * 800);
        });
      }
    }

    knownPendingIds.current = currentPendingIds;
  }, [orders, playSelectedSound, autoPrint]);
}
