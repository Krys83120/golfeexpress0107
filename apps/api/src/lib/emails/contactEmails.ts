import { sendAdminAlert, sendEmail, emailShell, infoBox, formatDate } from "./shared";

interface ContactMessageData {
  name: string;
  email: string;
  type: string;
  subject: string;
  message: string;
}

/**
 * Alerte l'équipe Do You Geckoo dès qu'un message est envoyé via le widget
 * "Nous contacter" du site vitrine (voir ContactWidget.tsx et POST
 * /api/contact) -- simple heads-up qu'un message est arrivé. Le traitement
 * et la réponse se font depuis l'admin (voir ContactMessagesPage.tsx et
 * sendContactMessageRepliedEmail ci-dessous), PAS en répondant à cet email :
 * le message est archivé en base (model ContactMessage), répondre ici
 * court-circuiterait l'archivage.
 */
export async function sendContactMessageEmail(data: ContactMessageData): Promise<void> {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">✉️ Nouveau message — Nous contacter</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      <strong>${data.name}</strong> (${data.email}) — type : <strong>${data.type}</strong>
    </p>
    ${infoBox(`<strong>${data.subject}</strong><br/>${data.message.replace(/\n/g, "<br/>")}`, "orange")}
    <p style="font-size:13px;color:#6B7280;margin-top:16px;">
      À traiter et à archiver depuis l'admin, section « Messages ».
    </p>
  `);
  await sendAdminAlert(`Nous contacter — ${data.subject}`, html);
}

/** Accusé de réception envoyé au visiteur, pour confirmer que son message a bien été transmis. */
export async function sendContactMessageConfirmation(email: string, name: string): Promise<void> {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">✅ Message bien reçu</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Bonjour ${name}, nous avons bien reçu votre message et reviendrons vers vous sous 24h.
    </p>
    <p style="font-size:13px;color:#6B7280;margin-top:16px;">
      Do You Geckoo — contact@doyougeckoo.fr
    </p>
  `);
  await sendEmail(email, "Votre message a bien été reçu — Do You Geckoo", html);
}

interface ContactMessageRepliedData {
  subject: string;
  adminReply: string;
  repliedAt: string;
}

/** Envoyé au visiteur dès que l'admin répond à son message depuis ContactMessagesPage.tsx. */
export async function sendContactMessageRepliedEmail(email: string, data: ContactMessageRepliedData): Promise<void> {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">💬 Réponse à votre message</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Votre message « ${data.subject} » a reçu une réponse le ${formatDate(data.repliedAt)} :
    </p>
    ${infoBox(data.adminReply, "green")}
    <p style="font-size:13px;color:#6B7280;margin-top:16px;">
      Pour toute question complémentaire, contactez-nous à
      <a href="mailto:contact@doyougeckoo.fr" style="color:#2ECC71;">contact@doyougeckoo.fr</a>.
    </p>
  `);
  await sendEmail(email, `Réponse à votre message — ${data.subject}`, html);
}
