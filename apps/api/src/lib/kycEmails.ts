/**
 * Envoi d'emails transactionnels via Resend — même prestataire que sur les
 * autres projets (hashtagsaintemaxime.fr, reparmonphone.fr), pour rester
 * cohérent. Nécessite RESEND_API_KEY dans l'environnement ; si absente,
 * l'envoi est simplement journalisé et ignoré (ne bloque jamais la
 * validation elle-même — l'email est un bonus, pas une dépendance dure).
 */

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_ADDRESS = "Do You Geckoo <notifications@doyougeckoo.fr>";

const PRO_PORTAL_URL = "https://golfeexpress0107-pro.vercel.app";

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY manquante — email non envoyé (destinataire: ${to}, sujet: ${subject}).`);
    return;
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
  });

  if (!response.ok) {
    // On journalise mais on ne fait jamais échouer la validation elle-même
    // à cause d'un email qui ne part pas — l'action admin doit rester
    // effective indépendamment de la messagerie.
    console.error(`[email] Échec de l'envoi à ${to}:`, await response.text());
  }
}

function emailShell(bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:32px;">🦎</span>
      <div style="font-size:20px;font-weight:800;color:#1A1A2E;margin-top:4px;">Do You Geckoo</div>
    </div>
    <div style="background:white;border-radius:16px;padding:32px;">
      ${bodyHtml}
    </div>
    <p style="text-align:center;color:#9CA3AF;font-size:12px;margin-top:24px;">
      Do You Geckoo — Sainte-Maxime, Golfe de Saint-Tropez
    </p>
  </div>
</body>
</html>`;
}

function button(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:#2ECC71;color:#1A1A2E;font-weight:700;font-size:14px;padding:14px 28px;border-radius:999px;text-decoration:none;margin-top:20px;">${label}</a>`;
}

export async function sendProValidatedEmail(email: string, businessName: string): Promise<void> {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">🎉 Votre boutique est validée !</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Bonjour,<br><br>
      Bonne nouvelle : le dossier de <strong>${businessName}</strong> vient d'être validé par l'équipe Do You Geckoo.
      Votre boutique est maintenant visible par les clients du Golfe de Saint-Tropez et vous pouvez recevoir vos
      premières commandes.
    </p>
    ${button("Accéder à mon espace commerçant", PRO_PORTAL_URL)}
  `);
  await sendEmail(email, "Votre boutique Do You Geckoo est validée 🎉", html);
}

export async function sendProRejectedEmail(email: string, businessName: string, reason: string): Promise<void> {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">Votre dossier nécessite une correction</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Bonjour,<br><br>
      Nous n'avons pas pu valider le dossier de <strong>${businessName}</strong> pour le moment :
    </p>
    <div style="background:#FFF3E0;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="font-size:14px;color:#1A1A2E;margin:0;">${reason}</p>
    </div>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Corrigez votre dossier depuis votre espace commerçant, puis contactez-nous si besoin — votre demande sera
      réexaminée rapidement.
    </p>
    ${button("Corriger mon dossier", `${PRO_PORTAL_URL}/parametres`)}
  `);
  await sendEmail(email, "Votre dossier Do You Geckoo nécessite une correction", html);
}

export async function sendRiderValidatedEmail(email: string, firstName: string): Promise<void> {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">🎉 Votre dossier livreur est validé !</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Bonjour ${firstName},<br><br>
      Votre dossier vient d'être validé par l'équipe Do You Geckoo. Vous pouvez dès maintenant ouvrir l'app
      Livreur, passer en ligne, et commencer à livrer sur le Golfe de Saint-Tropez.
    </p>
    <p style="font-size:13px;color:#6B7280;">Ouvrez simplement l'application Do You Geckoo Livreur sur votre téléphone.</p>
  `);
  await sendEmail(email, "Votre dossier livreur Do You Geckoo est validé 🎉", html);
}

export async function sendRiderRejectedEmail(email: string, firstName: string, reason: string): Promise<void> {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">Votre dossier nécessite une correction</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Bonjour ${firstName},<br><br>
      Nous n'avons pas pu valider votre dossier livreur pour le moment :
    </p>
    <div style="background:#FFF3E0;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="font-size:14px;color:#1A1A2E;margin:0;">${reason}</p>
    </div>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Ouvrez l'application Do You Geckoo Livreur, rendez-vous dans "Mon dossier" pour corriger les informations
      concernées, puis contactez-nous si besoin — votre demande sera réexaminée rapidement.
    </p>
  `);
  await sendEmail(email, "Votre dossier livreur Do You Geckoo nécessite une correction", html);
}
