import { sendEmail, emailShell, button, infoBox, PORTAL_URLS } from "./shared";

// ==================== KYC (déjà existants, repris ici) ====================

export async function sendProValidatedEmail(email: string, businessName: string): Promise<void> {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">🎉 Votre boutique est validée !</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Bonjour,<br><br>
      Bonne nouvelle : le dossier de <strong>${businessName}</strong> vient d'être validé par l'équipe Do You Geckoo.
      Votre boutique est maintenant visible par les clients du Golfe de Saint-Tropez et vous pouvez recevoir vos
      premières commandes.
    </p>
    ${button("Accéder à mon espace commerçant", PORTAL_URLS.pro)}
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
    ${infoBox(reason, "orange")}
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Corrigez votre dossier depuis votre espace commerçant, puis contactez-nous si besoin — votre demande sera
      réexaminée rapidement.
    </p>
    ${button("Corriger mon dossier", `${PORTAL_URLS.pro}/parametres`)}
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
    ${infoBox(reason, "orange")}
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Ouvrez l'application Do You Geckoo Livreur, rendez-vous dans "Mon dossier" pour corriger les informations
      concernées, puis contactez-nous si besoin — votre demande sera réexaminée rapidement.
    </p>
  `);
  await sendEmail(email, "Votre dossier livreur Do You Geckoo nécessite une correction", html);
}

// ==================== SUSPENSION / RÉACTIVATION ====================

export async function sendAccountSuspendedEmail(
  email: string,
  firstName: string,
  kind: "pro" | "rider",
  reason?: string
): Promise<void> {
  const label = kind === "pro" ? "votre boutique" : "votre compte livreur";
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">Compte suspendu</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Bonjour ${firstName},<br><br>
      ${label.charAt(0).toUpperCase() + label.slice(1)} a été temporairement suspendu(e) par l'équipe Do You Geckoo.
    </p>
    ${reason ? infoBox(reason, "red") : ""}
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Pour toute question, contactez notre support en répondant à cet email.
    </p>
  `);
  await sendEmail(email, "Votre compte Do You Geckoo a été suspendu", html);
}

export async function sendAccountReactivatedEmail(email: string, firstName: string, kind: "pro" | "rider"): Promise<void> {
  const portalUrl = kind === "pro" ? PORTAL_URLS.pro : PORTAL_URLS.rider;
  const label = kind === "pro" ? "Votre boutique" : "Votre compte livreur";
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">✅ Compte réactivé</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Bonjour ${firstName},<br><br>
      ${label} vient d'être réactivé(e). Vous pouvez reprendre votre activité normalement.
    </p>
    ${button("Accéder à mon espace", portalUrl)}
  `);
  await sendEmail(email, "Votre compte Do You Geckoo a été réactivé", html);
}

// ==================== STRIPE CONNECT ====================

export async function sendStripeConnectActivatedEmail(
  email: string,
  firstName: string,
  kind: "pro" | "rider"
): Promise<void> {
  const portalUrl = kind === "pro" ? PORTAL_URLS.pro : PORTAL_URLS.rider;
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">💳 Paiements automatiques activés</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Bonjour ${firstName},<br><br>
      Vos coordonnées bancaires ont été validées par Stripe. Vous serez désormais payé automatiquement après
      chaque ${kind === "pro" ? "commande livrée" : "livraison"}, directement sur votre compte bancaire.
    </p>
    ${button(kind === "pro" ? "Voir mes finances" : "Voir mes gains", portalUrl)}
  `);
  await sendEmail(email, "Vos paiements automatiques sont activés 🎉", html);
}

// ==================== RAPPELS DOCUMENTS ====================

/**
 * Rappel proactif avant expiration du Kbis (doit dater de moins de 3 mois,
 * voir Pro.kbisUploadedAt dans le schéma). Pas encore de tâche planifiée
 * (cron) qui appelle cette fonction automatiquement — voir la note dans le
 * récapitulatif final.
 */
export async function sendKbisReminderEmail(email: string, businessName: string, daysRemaining: number): Promise<void> {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">📄 Pensez à renouveler votre Kbis</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Bonjour,<br><br>
      L'extrait Kbis de <strong>${businessName}</strong> arrivera à expiration (plus de 3 mois) dans
      <strong>${daysRemaining} jours</strong>. Merci d'en uploader un plus récent depuis votre espace commerçant
      pour éviter toute interruption de votre visibilité sur la plateforme.
    </p>
    ${button("Mettre à jour mon Kbis", `${PORTAL_URLS.pro}/parametres`)}
  `);
  await sendEmail(email, "Votre Kbis Do You Geckoo arrive à expiration", html);
}
