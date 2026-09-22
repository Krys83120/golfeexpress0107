import { useEffect, useRef } from "react";
import { OrderStatus, type Order } from "@golfeexpress/types";
import { useProOrdersStore } from "@/store/useProOrdersStore";
import { useNotificationSettingsStore } from "@/store/useNotificationSettingsStore";
import { printOrderLabel } from "@/services/printLabel";
import { CONFIRMED_LATE_THRESHOLD_MINUTES } from "@/services/orderStatusFlow";

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
  const playAlertForOrders = useNotificationSettingsStore((s) => s.playAlertForOrders);
  const autoPrint = useNotificationSettingsStore((s) => s.autoPrint);
  const knownConfirmedIds = useRef<Set<string> | null>(null);
  // Mémorise les commandes déjà signalées "en retard" (voir effet plus bas)
  // pour ne les sonner qu'UNE fois au passage du seuil, pas à chaque cycle
  // de rafraîchissement (15s, voir App.tsx) tant qu'elles restent CONFIRMED.
  const alertedLateIds = useRef<Set<string>>(new Set());

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
      // Une sonnerie par commande affichée (22/09/2026, demande de Krys),
      // pas une seule sonnerie même si plusieurs commandes arrivent dans le
      // même cycle de rafraîchissement -- voir playAlertForOrders.
      playAlertForOrders(newOrders.length);
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
  }, [orders, playAlertForOrders, autoPrint]);

  // Re-sonne pour toute commande CONFIRMED depuis plus de
  // CONFIRMED_LATE_THRESHOLD_MINUTES (10 min par défaut) sans être passée en
  // préparation -- ajouté le 22/09/2026, demande de Krys : "si au bout de
  // 10min les commandes ne sont tjrs pas passée en preparation ressonner".
  // Effet séparé de celui ci-dessus (déclenché par une NOUVELLE commande) :
  // celui-ci se redéclenche à chaque cycle de rafraîchissement des commandes
  // (15s) et vérifie l'ÂGE de celles déjà connues.
  useEffect(() => {
    const now = Date.now();
    const stillConfirmedIds = new Set<string>();

    const newlyLateOrders = orders.filter((o) => {
      if (o.status !== OrderStatus.CONFIRMED) return false;
      stillConfirmedIds.add(o.id);
      const ageMinutes = (now - new Date(o.placedAt).getTime()) / 60_000;
      return ageMinutes >= CONFIRMED_LATE_THRESHOLD_MINUTES && !alertedLateIds.current.has(o.id);
    });

    if (newlyLateOrders.length > 0) {
      newlyLateOrders.forEach((o) => alertedLateIds.current.add(o.id));
      playAlertForOrders(newlyLateOrders.length);
    }

    // Nettoyage : une commande qui n'est plus CONFIRMED (préparation
    // démarrée, annulée...) est retirée de la mémoire -- si elle redevenait
    // CONFIRMED plus tard (cas normalement impossible), elle pourrait de
    // nouveau déclencher l'alerte de retard le moment venu.
    for (const id of alertedLateIds.current) {
      if (!stillConfirmedIds.has(id)) alertedLateIds.current.delete(id);
    }
  }, [orders, playAlertForOrders]);
}
