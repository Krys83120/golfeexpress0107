import type { AdminPartnerPack } from "@golfeexpress/types";
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

export interface PremiumUpsellEmailData {
  businessName: string;
  /** Texte d'accroche saisi/modifié par l'Admin avant envoi -- voir
   * admin/pros/[proId]/premium-upsell/route.ts. Tout le reste du mail
   * (comparatif des packs, bouton, mise en forme) reste fixe. */
  introText: string;
  /** Commission actuelle du Pro (son pack en cours, généralement Découverte). */
  currentCommissionRate: number;
  premiumPack: AdminPartnerPack;
  premiumPlusPack: AdminPartnerPack;
}

function packCard(pack: AdminPartnerPack, accentColor: string): string {
  const featuresHtml = pack.features
    .map((f) => `<li style="margin-bottom:4px;">${f}</li>`)
    .join("");
  return `
    <div style="border:2px solid ${accentColor};border-radius:12px;padding:20px;margin:16px 0;">
      <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${accentColor};margin:0 0 6px;">
        Pack ${pack.name}
      </p>
      <p style="font-size:22px;font-weight:800;color:#1A1A2E;margin:0 0 12px;">
        ${formatEuros(pack.priceMonthly)} <span style="font-size:13px;font-weight:400;color:#6B7280;">/ mois</span>
      </p>
      <ul style="margin:0;padding-left:18px;font-size:13px;color:#374151;line-height:1.5;">${featuresHtml}</ul>
    </div>`;
}

/**
 * Construit le HTML du mail d'incitation Premium sans l'envoyer -- séparé
 * de sendPremiumUpsellEmail ci-dessous pour servir aussi à l'aperçu côté
 * admin (mode "preview" de la route, qui ne doit jamais déclencher un vrai
 * envoi). Les prix/commissions/avantages affichés viennent TOUJOURS des
 * packs passés en paramètre (lus en live depuis la config Admin > Packs
 * Partenaires via findPack, jamais codés en dur ici) -- si Krys ajuste un
 * tarif, le prochain envoi (et son aperçu) reflètent immédiatement le
 * nouveau prix.
 */
export function buildPremiumUpsellEmailHtml(data: PremiumUpsellEmailData): string {
  const { businessName, introText, currentCommissionRate, premiumPack, premiumPlusPack } = data;
  return emailShell(`
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;">🚀 Passez à un pack Premium</h1>
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Bonjour <strong>${businessName}</strong>,
    </p>
    <p style="font-size:14px;color:#374151;line-height:1.6;white-space:pre-line;">${introText}</p>
    ${packCard(premiumPack, "#2196F3")}
    ${packCard(premiumPlusPack, "#9C27B0")}
    <p style="font-size:13px;color:#6B7280;line-height:1.6;">
      Actuellement, votre commerce est sur le pack Découverte (gratuit), avec une commission de
      ${(currentCommissionRate * 100).toFixed(0)}% par commande. Passer à un pack payant réduit cette commission
      dès le mois suivant, en plus des autres avantages ci-dessus. Vous pouvez changer de pack à tout moment
      depuis votre espace Pro.
    </p>
    ${button("Découvrir les packs Premium", SUBSCRIPTION_URL)}
  `);
}

/** Envoi réel (ou test) du mail d'incitation Premium -- voir buildPremiumUpsellEmailHtml ci-dessus. */
export async function sendPremiumUpsellEmail(email: string, subject: string, data: PremiumUpsellEmailData): Promise<void> {
  const html = buildPremiumUpsellEmailHtml(data);
  await sendEmail(email, subject, html);
}
