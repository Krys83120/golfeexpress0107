import { sendAdminAlert, emailShell, infoBox, button, PORTAL_URLS } from "./shared";

/**
 * Alerte "commande sans livreur" — envoyée par le cron capacity-sweep
 * quand une commande reste PREPARING/READY sans riderId au-delà de
 * STUCK_ORDER_ALERT_THRESHOLD_MINUTES (voir capacitySettings.ts). Une
 * seule fois par commande (voir Order.riderSearchAlertSent) pour ne pas
 * spammer l'admin à chaque passage du cron tant que rien n'a changé.
 */
export async function sendStuckOrderAlert(data: {
  orderNumber: string;
  orderId: string;
  proBusinessName: string;
  minutesWaiting: number;
}): Promise<void> {
  const html = emailShell(`
    <h2 style="font-size:18px;color:#1A1A2E;margin:0 0 12px;">🚨 Commande sans livreur</h2>
    <p style="font-size:14px;color:#1A1A2E;margin:0 0 8px;">
      La commande <strong>#${data.orderNumber}</strong> chez <strong>${data.proBusinessName}</strong> attend un
      livreur depuis plus de <strong>${data.minutesWaiting} minutes</strong> sans qu'aucun ne l'ait acceptée.
    </p>
    ${infoBox(
      "Vérifiez la disponibilité des livreurs en ligne et intervenez manuellement si besoin (contacter un livreur, ou annuler/rembourser la commande si elle ne peut pas être honorée).",
      "red"
    )}
    ${button("Ouvrir l'admin", `${PORTAL_URLS.admin}`)}
  `);

  await sendAdminAlert(`🚨 Commande #${data.orderNumber} sans livreur depuis ${data.minutesWaiting} min`, html);
}
