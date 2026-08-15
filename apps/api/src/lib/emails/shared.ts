/**
 * Infrastructure partagée pour tous les emails transactionnels Do You
 * Geckoo, envoyés via Resend. Voir authEmails.ts / orderEmails.ts /
 * accountEmails.ts / adminEmails.ts pour les templates concrets — ce
 * fichier ne contient que la "tuyauterie" commune (envoi, habillage
 * visuel, URLs des espaces).
 */

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_ADDRESS = "Do You Geckoo <notifications@doyougeckoo.fr>";
const ADMIN_EMAIL = process.env.ADMIN_ALERT_EMAIL ?? "contact@doyougeckoo.fr";

export const PORTAL_URLS = {
  client: "https://commander.doyougeckoo.fr",
  pro: "https://pro.doyougeckoo.fr",
  rider: "https://livreur.doyougeckoo.fr",
  admin: "https://admin.doyougeckoo.fr",
};

/** Pièce jointe Resend — `content` est le fichier encodé en base64 (pas de préfixe "data:"). */
export interface EmailAttachment {
  filename: string;
  content: string;
}

/**
 * Envoi bas niveau via l'API Resend. Nécessite RESEND_API_KEY dans
 * l'environnement ; si absente, l'envoi est journalisé et ignoré sans
 * jamais faire échouer l'action métier qui a déclenché l'email (une
 * validation, une commande... doivent rester effectives même si l'email
 * ne part pas).
 */
export async function sendEmail(to: string, subject: string, html: string, attachments?: EmailAttachment[]): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY manquante — email non envoyé (destinataire: ${to}, sujet: ${subject}).`);
    return;
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to,
        subject,
        html,
        ...(attachments && attachments.length > 0 ? { attachments } : {}),
      }),
    });

    if (!response.ok) {
      console.error(`[email] Échec de l'envoi à ${to}:`, await response.text());
    }
  } catch (err) {
    // Erreur réseau vers Resend : on journalise et on continue, jamais
    // d'exception remontée à l'appelant pour un email raté.
    console.error(`[email] Erreur réseau lors de l'envoi à ${to}:`, err);
  }
}

/** Envoie une alerte à l'équipe Do You Geckoo (toi). */
export async function sendAdminAlert(subject: string, html: string): Promise<void> {
  await sendEmail(ADMIN_EMAIL, subject, html);
}

/** Habillage visuel commun (logo, carte blanche, pied de page) à tous les emails. */
export function emailShell(bodyHtml: string): string {
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

export function button(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:#2ECC71;color:#1A1A2E;font-weight:700;font-size:14px;padding:14px 28px;border-radius:999px;text-decoration:none;margin-top:20px;">${label}</a>`;
}

/** Petit encadré coloré, réutilisé pour les motifs de refus, alertes, etc. */
export function infoBox(html: string, color: "orange" | "red" | "green" = "orange"): string {
  const palette = {
    orange: { bg: "#FFF3E0", text: "#1A1A2E" },
    red: { bg: "#FEF2F2", text: "#991B1B" },
    green: { bg: "#E8F5E9", text: "#1A1A2E" },
  }[color];
  return `<div style="background:${palette.bg};border-radius:8px;padding:16px;margin:16px 0;"><p style="font-size:14px;color:${palette.text};margin:0;">${html}</p></div>`;
}

export function formatEuros(amount: number): string {
  return `${amount.toFixed(2).replace(".", ",")} €`;
}
