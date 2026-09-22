import { useEffect, useRef } from "react";
import { OrderStatus, type Order } from "@golfeexpress/types";
import { useProOrdersStore } from "@/store/useProOrdersStore";
import { useNotificationSettingsStore } from "@/store/useNotificationSettingsStore";
import { printOrderLabel } from "@/services/printLabel";

/**
 * Surveille les commandes du Pro et, dès qu'une NOUVELLE commande CONFIRMED
 * apparaît (comparaison des ids vus au tour de polling précédent) :
 * - joue le son de notification choisi (voir NotificationsPage)
 * - imprime automatiquement son étiquette si ce réglage est activé
 *
 * CORRECTIF du 22/09/2026 (bug trouvé en mettant en place le mode test
 * Admin, signalé à Krys) : ce hook surveillait jusqu'ici OrderStatus.PENDING,
 * mais GET /api/orders exclut désormais les commandes PENDING pour un
 * compte PRO/PRO_EMPLOYEE (voir orders/route.ts, excludePendingForPro,
 * ajouté le 23/08/2026 -- le Pro ne doit voir une commande qu'une fois son
 * paiement confirmé). Résultat : `orders` ne contenait plus JAMAIS de
 * commande PENDING côté Pro, donc `pendingOrders` était toujours vide et ni
 * le son ni l'impression automatique ne se déclenchaient jamais, même sur
 * une vraie nouvelle commande. CONFIRMED est désormais le bon statut à
 * surveiller : c'est le premier statut qu'une commande peut avoir dans la
 * liste du Pro (paiement confirmé, prête à être préparée) -- exactement le
 * moment "nouvelle commande" que ce hook est censé détecter.
 *
 * Placé une seule fois au niveau racine de l'app (MainApp) pour continuer à
 * détecter les nouvelles commandes même quand la page Commandes n'est pas
 * affichée (le Pro peut être sur Menu ou Finances quand une commande arrive).
 */
export function useNewOrderNotifications() {
  const orders = useProOrdersStore((s) => s.orders);
  const playSelectedSound = useNotificationSettingsStore((s) => s.playSelectedSound);
  const autoPrint = useNotificationSettingsStore((s) => s.autoPrint);
  const knownConfirmedIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    const confirmedOrders = orders.filter((o) => o.status === OrderStatus.CONFIRMED);
    const currentConfirmedIds = new Set(confirmedOrders.map((o) => o.id));

    // Premier passage (juste après le chargement initial) : on mémorise
    // l'état de départ sans rien déclencher, pour ne pas notifier/imprimer
    // bruyamment toutes les commandes déjà confirmées à l'ouverture du
    // dashboard (ex: après un rechargement de page).
    if (knownConfirmedIds.current === null) {
      knownConfirmedIds.current = currentConfirmedIds;
      return;
    }

    const newOrders: Order[] = confirmedOrders.filter((o) => !knownConfirmedIds.current!.has(o.id));
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

    knownConfirmedIds.current = currentConfirmedIds;
  }, [orders, playSelectedSound, autoPrint]);
}
