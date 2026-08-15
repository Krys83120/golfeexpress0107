import { sendEmail, emailShell } from "./shared";

/** Envoie le ticket de commande (PDF) en pièce jointe au destinataire. */
export async function sendReceiptEmail(to: string, orderNumber: string, pdf: Buffer): Promise<void> {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">🧾 Votre ticket de commande</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Voici le ticket de votre commande <strong>${orderNumber}</strong>, en pièce jointe (PDF).
    </p>
  `);
  await sendEmail(to, `Ticket — commande ${orderNumber}`, html, [
    { filename: `ticket-${orderNumber}.pdf`, content: pdf.toString("base64") },
  ]);
}

/** Envoie le rapport Z (PDF) en pièce jointe au Pro. */
export async function sendZReportEmail(to: string, periodLabel: string, pdf: Buffer): Promise<void> {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">📄 Rapport Z</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Voici votre rapport Z pour la période <strong>${periodLabel}</strong>, en pièce jointe (PDF).
    </p>
  `);
  const safeName = periodLabel.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase();
  await sendEmail(to, `Rapport Z — ${periodLabel}`, html, [{ filename: `rapport-z-${safeName}.pdf`, content: pdf.toString("base64") }]);
}
