import { sendEmail, emailShell, button, infoBox, PORTAL_URLS } from "./shared";

interface StockOutAlertData {
  proBusinessName: string;
  /** Nom du produit, ou "Produit — Choix" pour un choix d'option précis (voir PATCH /api/pros/me/stock). */
  itemLabel: string;
  employeeName: string;
}

/**
 * Alerte envoyée au PATRON quand un compte EMPLOYÉ (jamais le patron
 * lui-même, voir PATCH /api/pros/me/stock -- inutile de l'alerter de ses
 * propres actions) coche un produit ou un choix d'option en rupture. Voir
 * Product.isAvailable / OptionChoice.isAvailable dans prisma/schema.prisma --
 * la bascule reste manuelle et permanente tant que quelqu'un (patron ou
 * employé) ne la remet pas disponible depuis l'onglet Stock de l'app Pro.
 */
export async function sendStockOutAlertToProEmail(to: string, data: StockOutAlertData): Promise<void> {
  const html = await emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">⚠️ Rupture de stock signalée</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      <strong>${data.employeeName}</strong> vient de signaler <strong>${data.itemLabel}</strong> en rupture chez
      <strong>${data.proBusinessName}</strong>.
    </p>
    ${infoBox(
      "Cet article n'est plus proposé aux clients jusqu'à ce qu'il soit remis disponible — par vous ou par un employé, depuis l'onglet Stock de l'app Pro.",
      "orange"
    )}
    ${button("Ouvrir l'app Pro", PORTAL_URLS.pro)}
  `);
  await sendEmail(to, `Rupture signalée : ${data.itemLabel}`, html);
}
