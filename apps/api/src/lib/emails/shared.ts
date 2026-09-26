/**
 * Infrastructure partagée pour tous les emails transactionnels Do You
 * Geckoo, envoyés via Resend. Voir authEmails.ts / orderEmails.ts /
 * accountEmails.ts / adminEmails.ts pour les templates concrets — ce
 * fichier ne contient que la "tuyauterie" commune (envoi, habillage
 * visuel, URLs des espaces).
 */

import { prisma } from "@/lib/prisma";

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_ADDRESS = "Do You Geckoo <notifications@doyougeckoo.fr>";
const ADMIN_EMAIL = process.env.ADMIN_ALERT_EMAIL ?? "contact@doyougeckoo.fr";

export const PORTAL_URLS = {
  client: "https://commander.doyougeckoo.fr",
  pro: "https://pro.doyougeckoo.fr",
  rider: "https://livreur.doyougeckoo.fr",
  admin: "https://admin.doyougeckoo.fr",
  /** Site vitrine -- ajouté le 26/09/2026 pour rendre le logo cliquable dans emailShell (demande de Krys). */
  www: "https://www.doyougeckoo.fr",
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
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: EmailAttachment[],
  replyTo?: string
): Promise<void> {
  await sendTrackedEmail(to, subject, html, attachments, replyTo);
}

/**
 * Identique à `sendEmail`, mais renvoie l'identifiant du message Resend
 * (`{ id }` dans la réponse de leur API) -- ajouté le 26/09/2026 pour la
 * prospection commerciale (voir lib/emails/prospectingEmails.ts et
 * app/api/webhooks/resend/route.ts) : c'est cet identifiant qui permet de
 * relier un événement webhook Resend ("email.opened", "email.clicked") au
 * bon Prospect en base, puisque Resend n'accepte pas de métadonnée
 * personnalisée arbitraire sur un envoi simple. `sendEmail` ci-dessus reste
 * inchangé pour tous les autres appelants (aucun n'a besoin de cet id) --
 * ils continuent d'ignorer la valeur de retour comme avant.
 */
export async function sendTrackedEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: EmailAttachment[],
  replyTo?: string
): Promise<{ id: string | null }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY manquante — email non envoyé (destinataire: ${to}, sujet: ${subject}).`);
    return { id: null };
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
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    if (!response.ok) {
      console.error(`[email] Échec de l'envoi à ${to}:`, await response.text());
      return { id: null };
    }

    const data = await response.json().catch(() => null);
    return { id: typeof data?.id === "string" ? data.id : null };
  } catch (err) {
    // Erreur réseau vers Resend : on journalise et on continue, jamais
    // d'exception remontée à l'appelant pour un email raté.
    console.error(`[email] Erreur réseau lors de l'envoi à ${to}:`, err);
    return { id: null };
  }
}

/**
 * Envoie une alerte à l'équipe Do You Geckoo (toi). `replyTo` optionnel —
 * utilisé par le formulaire "Nous contacter" du site vitrine pour que
 * répondre directement dans ta boîte mail réponde au visiteur, sans avoir
 * besoin d'une interface admin dédiée pour ces messages ponctuels.
 */
export async function sendAdminAlert(subject: string, html: string, replyTo?: string): Promise<void> {
  await sendEmail(ADMIN_EMAIL, subject, html, undefined, replyTo);
}

// Cache mémoire très court (30s) des logos par app, utilisés dans les
// emails -- demande de Krys du 25/09/2026 ("le logo dans le mail c'est
// celui principal du site www"), étendue le 26/09/2026 pour pouvoir aussi
// afficher le logo Pro et le logo Livreur dans les sections correspondantes
// du mail de prospection (voir prospectingEmails.ts). Mêmes GlobalSetting
// que ceux gérés depuis Admin > Branding (un logo par app -- voir
// apps/admin/src/services/brandingApi.ts, APP_LOGO_SETTING_KEY) : aucune
// nouvelle donnée à saisir, on relit simplement ce que Krys y a déjà
// configuré. Le cache évite une requête DB à chaque email (utile pour un
// envoi groupé, ex. rapports), sans jamais afficher un logo périmé plus de
// 30s après un changement dans Admin > Branding.
const LOGO_SETTING_KEYS = {
  www: "branding.www_logo_url",
  pro: "branding.logo_url_pro",
  livreur: "branding.logo_url_livreur",
} as const;

const logoUrlCache = new Map<string, { url: string | null; fetchedAt: number }>();
const LOGO_CACHE_TTL_MS = 30_000;

async function getAppLogoUrl(settingKey: string): Promise<string | null> {
  const cached = logoUrlCache.get(settingKey);
  if (cached && Date.now() - cached.fetchedAt < LOGO_CACHE_TTL_MS) {
    return cached.url;
  }
  try {
    const setting = await prisma.globalSetting.findUnique({ where: { key: settingKey } });
    const url =
      setting && typeof setting.value === "object" && setting.value !== null && "url" in (setting.value as any)
        ? (setting.value as { url: string }).url
        : null;
    logoUrlCache.set(settingKey, { url, fetchedAt: Date.now() });
    return url;
  } catch (err) {
    // Un logo manquant ne doit jamais empêcher l'envoi d'un email — on
    // journalise et on retombe sur le repli émoji, comme le fait déjà
    // NavClient.tsx côté site vitrine quand un logo d'app est absent.
    console.error(`[email] Impossible de récupérer le logo (${settingKey}):`, err);
    return null;
  }
}

/** Logo du site vitrine (Admin > Branding) -- utilisé en en-tête de tous les emails, exporté aussi pour les emails qui veulent le réutiliser dans leur propre corps (ex. l'animation "mascotte" du mail de prospection). */
export async function getWwwLogoUrl(): Promise<string | null> {
  return getAppLogoUrl(LOGO_SETTING_KEYS.www);
}

/** Logo de l'app Pro (Admin > Branding) -- null si jamais configuré, à gérer côté appelant (repli emoji). */
export async function getProLogoUrl(): Promise<string | null> {
  return getAppLogoUrl(LOGO_SETTING_KEYS.pro);
}

/** Logo de l'app Livreur (Admin > Branding) -- null si jamais configuré, à gérer côté appelant (repli emoji). */
export async function getLivreurLogoUrl(): Promise<string | null> {
  return getAppLogoUrl(LOGO_SETTING_KEYS.livreur);
}

/**
 * Habillage visuel commun (logo, carte blanche, pied de page) à tous les
 * emails. Logo cliquable vers le site vitrine depuis le 26/09/2026 (demande
 * de Krys, mail de prospection : "le logo en haut aussi doit être
 * cliquable") -- appliqué à emailShell globalement plutôt qu'en cas
 * particulier pour le mail de prospection, puisque c'est un comportement
 * standard et sans risque pour n'importe quel email transactionnel (le clic
 * ramène simplement vers doyougeckoo.fr).
 *
 * `headExtra` (optionnel, ajouté le 26/09/2026) : bloc <style> additionnel
 * injecté dans un <head>, réservé aux emails qui en ont besoin (ex. la
 * petite animation CSS "mascotte qui traverse l'écran" du mail de
 * prospection -- voir prospectingEmails.ts). Absent par défaut : les
 * appelants existants n'ont rien à changer.
 */
export async function emailShell(bodyHtml: string, headExtra?: string): Promise<string> {
  const logoUrl = await getWwwLogoUrl();
  const logoContent = logoUrl
    ? `<img src="${logoUrl}" alt="Do You Geckoo" style="max-width:220px;max-height:80px;width:auto;height:auto;" />`
    : `<span style="font-size:32px;">🦎</span>
      <div style="font-size:20px;font-weight:800;color:#1A1A2E;margin-top:4px;">Do You Geckoo</div>`;
  const header = `<a href="${PORTAL_URLS.www}" style="text-decoration:none;">${logoContent}</a>`;
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
${headExtra ?? ""}
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:24px;">
      ${header}
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

/** Formate une date (Date ou ISO string) en français long — ex: "16 août 2026". */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
