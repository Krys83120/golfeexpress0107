import { sendEmail, emailShell, button, infoBox, formatEuros, formatDate, PORTAL_URLS } from "./shared";

const SUBSCRIPTION_URL = `${PORTAL_URLS.pro}?tab=subscription`;

interface SubscriptionEmailData {
  businessName: string;
  packName: string;
  priceMonthly: number;
  commissionRate: number;
  /** ISO — début de la période payée en cours. */
  periodStart: string;
  /** ISO — date du prochain renouvellement (ou de fin d'accès si résilié). */
  periodEnd: string;
}

/**
 * Envoyé juste après une souscription réussie (webhook Stripe
 * checkout.session.completed) — confirme la "prise en compte" de
 * l'abonnement et récapitule le pack choisi, son prix, sa commission et sa
 * durée de validité, pour que le Pro ait une trace écrite indépendante du
 * reçu de paiement automatique de Stripe.
 */
export async function sendSubscriptionConfirmedEmail(email: string, data: SubscriptionEmailData): Promise<void> {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">🎉 Abonnement ${data.packName} confirmé</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Bonjour <strong>${data.businessName}</strong>, votre souscription au pack <strong>${data.packName}</strong>
      est bien prise en compte. Vos nouveaux avantages (commission à ${(data.commissionRate * 100).toFixed(0)}%,
      visibilité renforcée) sont actifs dès maintenant.
    </p>
    ${infoBox(
      `<strong>Récapitulatif</strong><br/>
      Pack : ${data.packName}<br/>
      Prix : ${formatEuros(data.priceMonthly)} / mois<br/>
      Commission appliquée : ${(data.commissionRate * 100).toFixed(0)}%<br/>
      Période en cours : du ${formatDate(data.periodStart)} au ${formatDate(data.periodEnd)}<br/>
      Renouvellement automatique le ${formatDate(data.periodEnd)}, sauf résiliation avant cette date.`,
      "green"
    )}
    <p style="font-size:13px;color:#6B7280;line-height:1.6;">
      Le reçu de paiement Stripe vous parvient séparément par email. Vous pouvez consulter l'historique de vos
      factures et gérer votre abonnement à tout moment depuis votre espace Pro.
    </p>
    ${button("Gérer mon abonnement", SUBSCRIPTION_URL)}
  `);
  await sendEmail(email, `Abonnement ${data.packName} confirmé`, html);
}

interface SubscriptionCancelledEmailData {
  businessName: string;
  packName: string;
  /** ISO — date à laquelle l'accès au pack payant prend réellement fin. */
  effectiveDate: string;
}

/**
 * Envoyé quand une résiliation est enregistrée (bouton "Annuler" côté Pro,
 * ou résiliation depuis le Billing Portal Stripe) — précise bien que le
 * mois déjà payé reste actif jusqu'à `effectiveDate`, pas de coupure
 * immédiate.
 */
export async function sendSubscriptionCancelledEmail(email: string, data: SubscriptionCancelledEmailData): Promise<void> {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">Résiliation enregistrée</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Bonjour <strong>${data.businessName}</strong>, votre résiliation du pack <strong>${data.packName}</strong>
      est bien enregistrée. Vous conservez tous vos avantages jusqu'au <strong>${formatDate(data.effectiveDate)}</strong>
      (le mois déjà payé va jusqu'à son terme) — aucun nouveau prélèvement n'aura lieu après cette date.
    </p>
    ${infoBox(
      `À partir du ${formatDate(data.effectiveDate)}, votre commerce repasse automatiquement sur le pack
      Découverte (gratuit). Vous pouvez annuler cette résiliation à tout moment avant cette date depuis votre
      espace Pro.`,
      "orange"
    )}
    ${button("Gérer mon abonnement", SUBSCRIPTION_URL)}
  `);
  await sendEmail(email, `Résiliation de votre pack ${data.packName} enregistrée`, html);
}

interface SubscriptionReactivatedEmailData {
  businessName: string;
  packName: string;
  /** ISO — prochaine date de renouvellement désormais confirmée. */
  nextRenewalDate: string;
}

/** Envoyé quand une résiliation en attente est annulée avant d'avoir pris effet. */
export async function sendSubscriptionReactivatedEmail(email: string, data: SubscriptionReactivatedEmailData): Promise<void> {
  const html = emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">✅ Abonnement réactivé</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Bonjour <strong>${data.businessName}</strong>, votre résiliation du pack <strong>${data.packName}</strong> a
      bien été annulée. Votre abonnement continue normalement et se renouvellera automatiquement le
      <strong>${formatDate(data.nextRenewalDate)}</strong>.
    </p>
    ${button("Voir mon abonnement", SUBSCRIPTION_URL)}
  `);
  await sendEmail(email, `Abonnement ${data.packName} réactivé`, html);
}
