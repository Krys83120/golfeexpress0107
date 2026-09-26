/**
 * Mail de prospection commerciale envoyé aux restaurants/commerces du Golfe
 * de Saint-Tropez pas encore Pro sur Do You Geckoo -- voir
 * app/api/admin/prospects/[prospectId]/send-email pour le mode
 * preview/test/send, sur le même principe que lib/emails/subscriptionEmails.ts
 * (buildPremiumUpsellEmailHtml).
 *
 * Objet + texte d'accroche modifiables depuis Admin avant envoi -- le reste
 * du mail (argumentaire, comparatif de commissions, forfaits, bouton
 * d'inscription) est généré ici et reste fixe, pour garder un rendu pro
 * cohérent d'un envoi à l'autre.
 *
 * Refonte du 26/09/2026 (demande de Krys : "il faut absolument que le mail
 * de prospection [soit] beaucoup + pro [...] il faut expliquer aux pros que
 * c'est une nouvelle plateforme locale créée localement [...] reprendre les
 * explications du site vitrine") -- le mail reprend maintenant le même
 * argumentaire que /notre-modele et /devenir-partenaire sur le site vitrine
 * (apps/www), avec les VRAIS chiffres de la plateforme plutôt que des
 * pourcentages arrondis à la main :
 * - Commission commerçant : DEFAULT_PACKS (lib/partnerPacks.ts) -- 21% en
 *   Découverte (gratuit, sans engagement), 18% en Premium, 15% en Premium+.
 * - Rémunération livreur : DEFAULT_RIDER_PAY_* (lib/pricingSettings.ts) --
 *   2,50€ de base + 0,95€/km, MINIMUM GARANTI 5€ par course.
 * - Comparatif "jusqu'à 30%" chez Uber Eats : même source que le site
 *   vitrine (voir COMPETITOR_COMMISSION_SOURCE ci-dessous) -- dupliquée ici
 *   volontairement (apps/www et apps/api sont deux apps Next.js séparées
 *   dans le monorepo, pas de package partagé pour ces constantes) ; si les
 *   chiffres changent d'un côté, les mettre à jour de l'autre aussi (même
 *   remarque que economics.ts côté www).
 */

import { SubscriptionType } from "@golfeexpress/types";
import {
  emailShell,
  button,
  infoBox,
  PORTAL_URLS,
  sendTrackedEmail,
  getProLogoUrl,
  getLivreurLogoUrl,
} from "./shared";
import { DEFAULT_PACKS } from "@/lib/partnerPacks";
import { DEFAULT_RIDER_PAY_BASE, DEFAULT_RIDER_PAY_PER_KM, DEFAULT_RIDER_PAY_MINIMUM } from "@/lib/pricingSettings";

/** Même source que apps/www/src/lib/economics.ts (COMPETITOR_COMMISSION_SOURCE) -- à garder synchronisée. */
const COMPETITOR_COMMISSION = {
  maxPct: 30,
  platform: "Uber Eats (formule Premium, livraison par la plateforme)",
  sourceLabel: "Fooderise — Comparatif des commissions plateformes 2026",
  sourceUrl: "https://www.fooderise.com/commission-plateformes",
  accessedDate: "23 août 2026",
};

const FREE_PACK = DEFAULT_PACKS.find((p) => p.tier === SubscriptionType.FREE)!;
const PREMIUM_PACK = DEFAULT_PACKS.find((p) => p.tier === SubscriptionType.PREMIUM)!;
const PREMIUM_PLUS_PACK = DEFAULT_PACKS.find((p) => p.tier === SubscriptionType.PREMIUM_PLUS)!;

const MIN_COMMISSION_PCT = Math.round(PREMIUM_PLUS_PACK.commissionRate * 100); // 15
const MAX_COMMISSION_PCT = Math.round(FREE_PACK.commissionRate * 100); // 21
const RIDER_TYPICAL_LABEL = `${DEFAULT_RIDER_PAY_MINIMUM}€ à 8€ selon la distance`;

export interface ProspectingEmailData {
  businessName: string;
  city: string;
  /** Texte d'accroche personnalisable par Krys (voir defaultIntro côté Admin). */
  introText: string;
}

/** Petite étiquette pill façon "onglet" -- purement visuelle (les emails ne peuvent pas avoir de vrais onglets interactifs), utilisée pour repérer chaque section au premier coup d'œil. */
function sectionLabel(emoji: string, text: string): string {
  return `<p style="display:inline-block;background:#1A1A2E;color:#FFFFFF;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;padding:6px 14px;border-radius:999px;margin:28px 0 12px;">${emoji} ${text}</p>`;
}

/**
 * Bouton d'appel à l'action "intermédiaire" (26/09/2026, demande de Krys :
 * "il faut des boutons intermédiaires encourageants d'action pour pouvoir
 * se connecter de suite au site au lieu d'attendre la fin du texte") --
 * volontairement en style "contour" (moins massif que button() de
 * shared.ts) pour ne pas concurrencer visuellement le bouton final, tout en
 * restant clairement cliquable à chaque étape clé du mail plutôt que
 * d'obliger à lire jusqu'au bout pour s'inscrire.
 */
function midButton(label: string, url: string): string {
  return `
  <div style="text-align:center;margin:18px 0 8px;">
    <a href="${url}" style="display:inline-block;background:#FFFFFF;color:#1A1A2E;font-weight:700;font-size:13px;padding:11px 24px;border-radius:999px;text-decoration:none;border:2px solid #1A1A2E;">${label}</a>
  </div>`;
}

/**
 * Petit badge "logo d'app" (26/09/2026, demande de Krys : "rajouter logo pro
 * et logo livreur dans les sections correspondantes") -- affiche le logo
 * configuré depuis Admin > Branding pour l'app concernée (apps/admin/src/
 * services/brandingApi.ts, APP_LOGO_SETTING_KEY), avec repli sur un badge
 * emoji si Krys n'a pas encore uploadé de logo distinct pour cette app
 * (jamais d'image cassée dans le mail).
 */
function appLogoBadge(logoUrl: string | null, emojiFallback: string, label: string): string {
  const visual = logoUrl
    ? `<img src="${logoUrl}" alt="${label}" width="40" height="40" style="width:40px;height:40px;border-radius:10px;object-fit:contain;background:#F3F4F6;" />`
    : `<span style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;background:#F3F4F6;font-size:20px;">${emojiFallback}</span>`;
  return `
  <div style="display:inline-block;text-align:center;margin:4px 10px 0 0;">
    ${visual}
    <p style="margin:4px 0 0;font-size:10px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.03em;">${label}</p>
  </div>`;
}

/** Table 2 colonnes (compatible Outlook) comparant Uber Eats & co. à Do You Geckoo. */
function commissionComparisonTable(): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;border-collapse:separate;border-spacing:8px 0;">
    <tr>
      <td width="50%" valign="top" style="background:#F3F4F6;border-radius:12px;padding:18px 16px;">
        <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#6B7280;">Plateformes classiques</p>
        <p style="margin:0 0 14px;font-size:14px;font-weight:800;color:#374151;">Uber Eats & co.</p>
        <p style="margin:0 0 2px;font-size:11px;color:#6B7280;">Commission commerçant</p>
        <p style="margin:0 0 12px;font-size:20px;font-weight:800;color:#6B7280;">jusqu'à ${COMPETITOR_COMMISSION.maxPct}%</p>
        <p style="margin:0 0 2px;font-size:11px;color:#6B7280;">Le livreur touche</p>
        <p style="margin:0;font-size:20px;font-weight:800;color:#6B7280;">≈ 4-5 €</p>
      </td>
      <td width="50%" valign="top" style="background:#E8F5E9;border:2px solid #2ECC71;border-radius:12px;padding:16px 16px;">
        <p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#1E8449;">Notre modèle</p>
        <p style="margin:0 0 14px;font-size:14px;font-weight:800;color:#1A1A2E;">🦎 Do You Geckoo</p>
        <p style="margin:0 0 2px;font-size:11px;color:#1A1A2E;">Commission commerçant</p>
        <p style="margin:0 0 12px;font-size:20px;font-weight:800;color:#1E8449;">${MIN_COMMISSION_PCT} à ${MAX_COMMISSION_PCT}%</p>
        <p style="margin:0 0 2px;font-size:11px;color:#1A1A2E;">Le livreur touche</p>
        <p style="margin:0;font-size:20px;font-weight:800;color:#1E8449;">${RIDER_TYPICAL_LABEL}</p>
      </td>
    </tr>
  </table>
  <p style="font-size:11px;color:#9CA3AF;line-height:1.5;margin:10px 0 0;">
    Source du chiffre concurrent : ${COMPETITOR_COMMISSION.platform}, ${COMPETITOR_COMMISSION.sourceLabel}, consulté le
    ${COMPETITOR_COMMISSION.accessedDate} (<a href="${COMPETITOR_COMMISSION.sourceUrl}" style="color:#9CA3AF;">voir la source</a>).
    Les taux réels varient selon le contrat et le volume du commerçant.
  </p>`;
}

/** 3 vignettes compactes -- un forfait par colonne, avec son prix et sa commission en gros. */
function packCards(): string {
  const cards = [
    { pack: FREE_PACK, highlight: false },
    { pack: PREMIUM_PACK, highlight: false },
    { pack: PREMIUM_PLUS_PACK, highlight: true },
  ];
  const cells = cards
    .map(
      ({ pack, highlight }) => `
      <td width="33%" valign="top" style="padding:0 6px;">
        <div style="background:#FFFFFF;border:2px solid ${highlight ? "#2ECC71" : "#E5E7EB"};border-radius:12px;padding:14px 10px;text-align:center;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:800;color:#1A1A2E;">${pack.name}</p>
          <p style="margin:0 0 2px;font-size:17px;font-weight:800;color:#1A1A2E;">${
            pack.priceMonthly > 0 ? `${pack.priceMonthly.toFixed(2).replace(".00", "")}€` : "Gratuit"
          }</p>
          <p style="margin:0 0 8px;font-size:10px;color:#9CA3AF;">${pack.priceMonthly > 0 ? "/ mois" : "sans engagement"}</p>
          <p style="margin:0;display:inline-block;background:${highlight ? "#E8F5E9" : "#F3F4F6"};color:${
            highlight ? "#1E8449" : "#374151"
          };font-size:12px;font-weight:800;padding:4px 10px;border-radius:999px;">${Math.round(pack.commissionRate * 100)}% commission</p>
        </div>
      </td>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0;"><tr>${cells}</tr></table>`;
}

export async function buildProspectingEmailHtml(data: ProspectingEmailData): Promise<string> {
  const [proLogoUrl, livreurLogoUrl] = await Promise.all([getProLogoUrl(), getLivreurLogoUrl()]);

  return emailShell(
    `
    <h1 style="font-size:20px;color:#1A1A2E;margin:0 0 12px;line-height:1.3;">
      🦎 ${data.businessName}, et si vous proposiez la livraison à ${data.city} avec Do You Geckoo ?
    </h1>

    <p style="font-size:14px;color:#374151;line-height:1.6;white-space:pre-line;margin-top:16px;">
      ${data.introText}
    </p>

    ${midButton("🚀 Je m'inscris tout de suite →", `${PORTAL_URLS.www}/devenir-partenaire`)}
    <p style="text-align:center;font-size:11px;color:#9CA3AF;margin:0 0 8px;">
      (ou continuez la lecture pour tout comprendre en détail)
    </p>

    ${sectionLabel("🌍", "Une plateforme 100% locale")}
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Do You Geckoo est une plateforme de livraison créée localement, dans le Golfe de Saint-Tropez, pour les
      commerçants et les habitants du Golfe -- ce n'est pas une antenne régionale d'un groupe international. Nous
      restons volontairement une plateforme au service d'un seul territoire, avec une équipe de livreurs locaux et
      une équipe joignable directement, pas un centre de support anonyme.
    </p>

    ${sectionLabel("⚠️", "Pourquoi Do You Geckoo existe")}
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Les grandes plateformes de livraison prélèvent des commissions qui peuvent atteindre ${COMPETITOR_COMMISSION.maxPct}%
      sur les commerçants, tout en reversant souvent une rémunération réduite au livreur qui fait le trajet. On a
      construit Do You Geckoo pour inverser ce rapport : des commissions nettement plus basses pour vous, et une
      rémunération minimum garantie pour le livreur -- <strong>au moins ${DEFAULT_RIDER_PAY_MINIMUM}€ par course</strong>,
      quelle que soit la distance.
    </p>

    ${sectionLabel("💰", "Nos commissions, en clair")}
    <p style="font-size:14px;color:#374151;line-height:1.6;margin-bottom:4px;">
      Sur une commande livrée, voici où va vraiment l'argent -- chez une plateforme classique, et chez nous :
    </p>
    ${commissionComparisonTable()}
    ${midButton("Je veux garder ma marge →", `${PORTAL_URLS.www}/devenir-partenaire`)}

    ${sectionLabel("🛵", "Des livreurs mieux payés")}
    ${appLogoBadge(livreurLogoUrl, "🛵", "Espace Livreur")}
    <p style="font-size:14px;color:#374151;line-height:1.6;margin-top:10px;">
      Chaque course est calculée simplement : ${DEFAULT_RIDER_PAY_BASE.toFixed(2).replace(".00", "")}€ de base, plus
      ${DEFAULT_RIDER_PAY_PER_KM.toFixed(2)}€ par kilomètre parcouru, avec un <strong>minimum garanti de
      ${DEFAULT_RIDER_PAY_MINIMUM}€</strong> par course -- affiché avant acceptation, sans surprise. Des livreurs mieux
      payés, c'est un réseau plus fiable et plus motivé pour livrer vos commandes rapidement.
    </p>

    ${sectionLabel("🤝", "Gardez vos livreurs habituels")}
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Si vous travaillez déjà avec un ou plusieurs livreurs de confiance, c'est le bon moment pour leur en parler.
      En les prévenant dès votre inscription, vous gardez une vraie <strong>continuité de service</strong> -- ce sont
      des visages qu'ils connaissent déjà qui continuent de livrer vos commandes -- et eux découvrent une
      rémunération minimum garantie nettement plus intéressante que sur les plateformes classiques. Vous gagnez en
      tranquillité, eux gagnent mieux leur vie, et vos clients gagnent en fiabilité : <strong>tout le monde y gagne
      !</strong> 🎉
    </p>
    ${midButton("Inviter mes livreurs habituels →", `${PORTAL_URLS.www}/devenir-livreur`)}

    ${sectionLabel("📦", "Nos forfaits -- sans obligation d'abonnement")}
    ${appLogoBadge(proLogoUrl, "🏪", "Espace Pro")}
    <p style="font-size:14px;color:#374151;line-height:1.6;margin-top:10px;margin-bottom:10px;">
      L'inscription est gratuite et le pack Découverte est <strong>disponible sans engagement, à vie</strong> -- vous
      n'êtes jamais obligé de souscrire à un abonnement payant pour vendre sur la plateforme. Deux formules payantes
      existent si vous voulez réduire encore votre commission et gagner en visibilité, mais rien n'est imposé :
      changement de pack ou résiliation possibles à tout moment, directement depuis votre espace Pro.
    </p>
    ${packCards()}
    <p style="font-size:11px;color:#9CA3AF;line-height:1.5;margin:8px 0 0;">Prix affichés TTC. Commission calculée uniquement sur les commandes effectivement livrées.</p>
    ${midButton("Commencer avec le pack gratuit →", `${PORTAL_URLS.www}/devenir-partenaire`)}

    ${sectionLabel("🎨", "Pas le temps de mettre votre carte en ligne ?")}
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Si vous n'êtes pas à l'aise avec l'informatique ou que vous manquez simplement de temps, nous proposons un
      <strong>forfait de création et de mise en ligne de vos produits</strong> : description, photos, prix, groupes
      d'options et catégories, tout est préparé pour vous par notre équipe. Vous gardez la main jusqu'au bout --
      rien n'est visible par vos clients tant que vous n'avez pas <strong>validé la fiche</strong> vous-même.
    </p>

    ${sectionLabel("🔒", "Vos paiements, sécurisés")}
    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Toutes les transactions sont gérées et sécurisées par <strong>Stripe</strong>, la référence mondiale du
      paiement en ligne -- nous n'avons à aucun moment accès à vos informations bancaires, qui ne transitent que par
      leur solution sécurisée. Plus de détails sur notre fonctionnement sur
      <a href="https://www.doyougeckoo.fr" style="color:#1E8449;font-weight:700;">www.doyougeckoo.fr</a>.
    </p>

    ${infoBox(
      `<strong>En résumé :</strong> vous gardez la main sur votre menu, vos horaires et vos tarifs. Pas de frais
      d'entrée, pas d'abonnement obligatoire, une commission parmi les plus basses du secteur, un réseau de livreurs
      locaux mieux payés donc plus motivés, une mise en ligne possible clé en main si besoin, et des paiements
      sécurisés par Stripe. Dossier commerçant simple, validé en général sous 24 à 48h.`,
      "green"
    )}

    <p style="font-size:14px;color:#374151;line-height:1.6;margin-top:20px;">
      Créez votre compte commerçant en quelques minutes, sans engagement :
    </p>
    <div style="text-align:center;">
      ${button("Créer mon compte commerçant →", `${PORTAL_URLS.www}/devenir-partenaire`)}
    </div>
    <p style="text-align:center;font-size:12px;color:#9CA3AF;margin-top:10px;">
      Une question avant de vous lancer ? Répondez simplement à ce mail, on vous répond personnellement.
    </p>

    <p style="font-size:12px;color:#9CA3AF;line-height:1.6;margin-top:24px;border-top:1px solid #E5E7EB;padding-top:16px;">
      Vous recevez ce message car votre établissement a été identifié comme proposant (ou pouvant proposer) la
      livraison dans le Golfe de Saint-Tropez. Si ce n'est pas le cas ou que vous ne souhaitez plus être contacté,
      répondez simplement à ce mail.
    </p>
  `
  );
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
