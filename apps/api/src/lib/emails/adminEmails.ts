import { sendAdminAlert, emailShell, button, infoBox, PORTAL_URLS } from "./shared";

export async function sendNewProPendingAlert(businessName: string, email: string): Promise<void> {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">🏪 Nouveau commerçant inscrit</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      <strong>${businessName}</strong> (${email}) vient de s'inscrire et attend la validation de son dossier.
    </p>
    ${button("Voir les validations en attente", `${PORTAL_URLS.admin}/validations`)}
  `);
  await sendAdminAlert(`Nouveau Pro en attente : ${businessName}`, html);
}

export async function sendNewRiderPendingAlert(firstName: string, lastName: string, email: string): Promise<void> {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">🛵 Nouveau livreur inscrit</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      <strong>${firstName} ${lastName}</strong> (${email}) vient de s'inscrire et attend la validation de son
      dossier.
    </p>
    ${button("Voir les validations en attente", `${PORTAL_URLS.admin}/validations`)}
  `);
  await sendAdminAlert(`Nouveau Livreur en attente : ${firstName} ${lastName}`, html);
}

export async function sendTransferFailedAlert(
  recipient: "pro" | "rider",
  orderNumber: string,
  amount: number,
  errorMessage: string
): Promise<void> {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">⚠️ Échec d'un virement Stripe Connect</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Le virement automatique de <strong>${amount.toFixed(2).replace(".", ",")} €</strong> vers le
      <strong>${recipient === "pro" ? "commerçant" : "livreur"}</strong> de la commande
      <strong>${orderNumber}</strong> a échoué.
    </p>
    ${infoBox(errorMessage, "red")}
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Cette commande reste valide côté client — seul le virement de la part concernée n'a pas abouti. À
      régulariser manuellement depuis le Dashboard Stripe si besoin.
    </p>
  `);
  await sendAdminAlert(`⚠️ Échec virement Stripe — commande ${orderNumber}`, html);
}
