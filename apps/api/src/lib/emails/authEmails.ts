import { sendEmail, emailShell, button, PORTAL_URLS } from "./shared";

type WelcomeRole = "client" | "pro" | "rider";

const WELCOME_CONTENT: Record<WelcomeRole, { title: string; body: string; ctaLabel: string; ctaUrl: string }> = {
  client: {
    title: "Bienvenue chez Do You Geckoo 🦎",
    body: "Votre compte est prêt ! Commandez repas, courses ou colis auprès des commerçants du Golfe de Saint-Tropez, livrés directement chez vous.",
    ctaLabel: "Découvrir les commerçants",
    ctaUrl: PORTAL_URLS.client,
  },
  pro: {
    title: "Bienvenue sur Do You Geckoo Pro 🦎",
    body: "Votre compte commerçant est créé. Complétez votre dossier (SIRET, Kbis, produits) depuis votre espace pour que notre équipe puisse le valider — vous serez notifié dès que votre boutique sera visible par les clients.",
    ctaLabel: "Compléter mon dossier",
    ctaUrl: PORTAL_URLS.pro,
  },
  rider: {
    title: "Bienvenue sur Do You Geckoo Livreur 🦎",
    body: "Votre compte livreur est créé. Complétez votre dossier (pièce d'identité, véhicule, assurance) depuis l'app pour que notre équipe puisse le valider — vous pourrez ensuite commencer à livrer.",
    ctaLabel: "Compléter mon dossier",
    ctaUrl: PORTAL_URLS.rider,
  },
};

/** Envoyé juste après une inscription réussie, quel que soit le rôle. */
export async function sendWelcomeEmail(email: string, firstName: string, role: WelcomeRole): Promise<void> {
  const content = WELCOME_CONTENT[role];
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">${content.title}</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Bonjour ${firstName},<br><br>
      ${content.body}
    </p>
    ${button(content.ctaLabel, content.ctaUrl)}
  `);
  await sendEmail(email, content.title, html);
}

/**
 * Email "mot de passe oublié" — le lien pointe vers l'espace correspondant
 * au rôle du compte (commander./pro./livreur./admin.doyougeckoo.fr), avec
 * le token en paramètre d'URL. Chaque app détecte ce paramètre au
 * démarrage et affiche l'écran de saisie du nouveau mot de passe.
 */
export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  resetUrl: string
): Promise<void> {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">Réinitialisation de mot de passe</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Bonjour ${firstName},<br><br>
      Vous avez demandé à réinitialiser votre mot de passe Do You Geckoo. Cliquez sur le bouton ci-dessous pour en
      choisir un nouveau. Ce lien est valable <strong>1 heure</strong>.
    </p>
    ${button("Réinitialiser mon mot de passe", resetUrl)}
    <p style="font-size:12px;color:#9CA3AF;margin-top:24px;">
      Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email — votre mot de passe restera
      inchangé.
    </p>
  `);
  await sendEmail(email, "Réinitialisation de votre mot de passe Do You Geckoo", html);
}
