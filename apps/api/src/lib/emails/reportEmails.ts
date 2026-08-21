import { sendAdminAlert, sendEmail, emailShell, button, infoBox, formatDate, PORTAL_URLS } from "./shared";

const CATEGORY_LABELS: Record<string, string> = {
  MISSING_ITEMS: "Article(s) manquant(s)",
  WRONG_ITEMS: "Erreur sur les articles",
  DAMAGED_OR_QUALITY: "Produit abîmé / qualité",
  LATE_DELIVERY: "Livraison en retard",
  DELIVERY_NOT_RECEIVED: "Livraison non reçue",
  RIDER_BEHAVIOR: "Comportement du livreur",
  CLIENT_UNREACHABLE: "Client injoignable",
  ADDRESS_ISSUE: "Problème d'adresse",
  PAYMENT_ISSUE: "Problème de paiement",
  STOCK_UNAVAILABLE: "Rupture de stock",
  TECHNICAL_ISSUE: "Problème technique",
  OTHER: "Autre",
};

const ROLE_LABELS: Record<string, string> = {
  CLIENT: "un client",
  RIDER: "un livreur",
  PRO: "un commerçant",
};

interface NewReportEmailData {
  reportId: string;
  orderNumber: string;
  reporterRole: string;
  reporterName: string;
  category: string;
  message: string;
}

/** Alerte l'équipe Do You Geckoo dès qu'une nouvelle réclamation/signalement est créé, quel que soit le rôle. */
export async function sendNewReportAdminAlert(data: NewReportEmailData): Promise<void> {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">🚩 Nouvelle réclamation</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Signalée par <strong>${ROLE_LABELS[data.reporterRole] ?? data.reporterRole}</strong>
      (${data.reporterName}) sur la commande <strong>${data.orderNumber}</strong>.
    </p>
    ${infoBox(`<strong>${CATEGORY_LABELS[data.category] ?? data.category}</strong><br/>${data.message}`, "orange")}
    ${button("Traiter dans l'admin", `${PORTAL_URLS.admin}`)}
  `);
  await sendAdminAlert(`Nouvelle réclamation — commande ${data.orderNumber}`, html);
}

interface ReportRepliedEmailData {
  orderNumber: string;
  category: string;
  adminReply: string;
  repliedAt: string;
}

/** Envoyé à l'auteur de la réclamation (client, livreur ou pro) dès que l'admin répond ou clôt le dossier. */
export async function sendReportRepliedEmail(email: string, data: ReportRepliedEmailData): Promise<void> {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">💬 Réponse à votre signalement</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Votre signalement (${CATEGORY_LABELS[data.category] ?? data.category}) concernant la commande
      <strong>${data.orderNumber}</strong> a reçu une réponse le ${formatDate(data.repliedAt)} :
    </p>
    ${infoBox(data.adminReply, "green")}
    <p style="font-size:13px;color:#6B7280;margin-top:16px;">
      Pour toute question complémentaire, contactez-nous à
      <a href="mailto:contact@doyougeckoo.fr" style="color:#2ECC71;">contact@doyougeckoo.fr</a>.
    </p>
  `);
  await sendEmail(email, `Réponse à votre signalement — commande ${data.orderNumber}`, html);
}
