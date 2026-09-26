/**
 * Mail de prospection commerciale envoyé aux restaurants/commerces du Golfe
 * de Saint-Tropez pas encore Pro sur Do You Geckoo (ajout du 26/09/2026,
 * demande de Krys) -- voir app/api/admin/prospects/[prospectId]/send-email
 * pour le mode preview/test/send, sur le même principe que
 * lib/emails/subscriptionEmails.ts (buildPremiumUpsellEmailHtml).
 *
 * Objet + texte d'accroche modifiables depuis Admin avant envoi -- le reste
 * du mail (argumentaire, bouton d'inscription) est généré ici et reste fixe,
 * pour garder un rendu pro cohérent d'un envoi à l'autre.
 */

import { emailShell, button, infoBox, PORTAL_URLS, sendTrackedEmail } from "./shared";

export interface ProspectingEmailData {
  businessName: string;
  city: string;
  /** Texte d'accroche personnalisable par Krys (voir defaultIntro côté Admin). */
  introText: string;
}

export async function buildProspectingEmailHtml(data: ProspectingEmailData): Promise<string> {
  return emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">
      🦎 ${data.businessName}, et si vous proposiez la livraison à ${data.city} avec Do You Geckoo ?
    </h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      ${data.introText}
    </p>
    ${infoBox(
      `<strong>Pourquoi rejoindre Do You Geckoo :</strong><br>
      • Une commission parmi les plus basses du marché, sans frais d'entrée ni abonnement obligatoire<br>
      • Une équipe de livreurs locaux, dédiée au Golfe de Saint-Tropez -- pas de sous-traitance anonyme<br>
      • Une visibilité auprès des clients (et des touristes) qui commandent déjà sur la plateforme dans votre ville<br>
      • Une mise en ligne rapide : dossier commerçant simple, validé en général en moins de 48h`,
      "green"
    )}
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      L'inscription est gratuite et ne vous engage à rien -- vous gardez la main sur votre menu, vos horaires et vos
      tarifs. Créez votre compte commerçant en quelques minutes :
    </p>
    ${button("Découvrir Do You Geckoo", `${PORTAL_URLS.pro}/inscription`)}
    <p style="font-size:12px;color:#9CA3AF;line-height:1.6;margin-top:24px;">
      Vous recevez ce message car votre établissement a été identifié comme proposant (ou pouvant proposer) la
      livraison dans le Golfe de Saint-Tropez. Si ce n'est pas le cas ou que vous ne souhaitez plus être contacté,
      répondez simplement à ce mail.
    </p>
  `);
}

/**
 * Envoie le mail et renvoie l'id Resend (voir sendTrackedEmail) -- c'est cet
 * id que la route d'envoi enregistre sur le Prospect pour que le webhook
 * Resend (app/api/webhooks/resend/route.ts) puisse ensuite relier un
 * événement "ouvert"/"cliqué" à la bonne ligne.
 */
export async function sendProspectingEmail(
  to: string,
  subject: string,
  data: ProspectingEmailData
): Promise<{ id: string | null }> {
  const html = await buildProspectingEmailHtml(data);
  return sendTrackedEmail(to, subject, html);
}
