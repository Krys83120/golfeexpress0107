import { sendAdminAlert, sendEmail, emailShell, infoBox } from "./shared";

/**
 * "Prévenez-moi" sur une ville sans commerçant actif encore -- ajout du
 * 03/10/2026, demande de Krys (toutes les villes sauf Sainte-Maxime sont
 * encore vides de commerçants, visiteurs qui repartent sans rien pouvoir
 * faire sur /livraison/[ville]). Volontairement SANS nouveau modèle Prisma
 * pour l'instant : une simple alerte email à Krys + un accusé de réception
 * au visiteur suffisent à ce stade -- si le volume devient important, une
 * vraie table + page Admin pourra être ajoutée plus tard sans rien casser
 * ici (voir POST /api/city-interest).
 */
export async function sendCityInterestAlert(data: { email: string; cityName: string }): Promise<void> {
  const html = await emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">📍 Demande d'ouverture</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      <strong>${data.email}</strong> souhaite être prévenu(e) dès que Do You Geckoo aura des commerçants
      partenaires à <strong>${data.cityName}</strong>.
    </p>
  `);
  // replyTo sur l'adresse du visiteur -- répondre directement dans la boîte
  // mail suffit si Krys veut le recontacter personnellement.
  await sendAdminAlert(`📍 Demande d'ouverture à ${data.cityName}`, html, data.email);
}

export async function sendCityInterestConfirmation(email: string, cityName: string): Promise<void> {
  const html = await emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">🦎 On vous préviendra !</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Merci ! Dès que des commerçants partenaires seront actifs à <strong>${cityName}</strong>, vous serez parmi
      les premiers informés.
    </p>
    ${infoBox(
      "En attendant, Do You Geckoo est déjà actif à Sainte-Maxime — vous pouvez y commander dès maintenant.",
      "green"
    )}
  `);
  await sendEmail(email, `On vous préviendra pour ${cityName} !`, html);
}
