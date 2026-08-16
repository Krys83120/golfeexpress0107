import { SubscriptionType } from "@golfeexpress/types";
import type { AdminPartnerPack, PartnerPack } from "@golfeexpress/types";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/**
 * Packs partenaires (abonnements Pro) — configuration stockée dans
 * GlobalSetting sous la clé PACKS_SETTING_KEY plutôt que dans un modèle
 * Prisma dédié : ça permet à l'admin d'ajuster prix/avantages/commission
 * depuis apps/admin sans jamais toucher au code ni faire de migration.
 *
 * DEFAULT_PACKS sert de valeur de repli tant qu'aucun admin n'a encore
 * enregistré de configuration (première ouverture de la page Packs
 * Partenaires côté admin) — l'app fonctionne donc dès le déploiement, sans
 * étape de "seed" manuelle en base.
 */
export const PACKS_SETTING_KEY = "partner_packs";

export const DEFAULT_PACKS: AdminPartnerPack[] = [
  {
    tier: SubscriptionType.FREE,
    name: "Découverte",
    priceMonthly: 0,
    commissionRate: 0.15,
    features: [
      "Fiche commerçant visible sur l'application et le site",
      "Réception et gestion des commandes en temps réel",
      "Statistiques de vente de base",
    ],
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
  },
  {
    tier: SubscriptionType.PREMIUM,
    name: "Premium",
    priceMonthly: 29,
    commissionRate: 0.1,
    features: [
      "Commission réduite à 10% (au lieu de 15%)",
      "Classement prioritaire dans les résultats de recherche",
      'Badge "Partenaire Premium" affiché sur votre fiche',
    ],
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
  },
  {
    tier: SubscriptionType.PREMIUM_PLUS,
    name: "Premium+",
    priceMonthly: 59,
    commissionRate: 0.07,
    features: [
      "Commission réduite à 7% (au lieu de 15%)",
      "Classement prioritaire maximal dans les résultats de recherche",
      'Badge "Partenaire Premium+" affiché sur votre fiche',
    ],
    isActive: true,
    stripeProductId: null,
    stripePriceId: null,
  },
];

/** Retire les champs internes (identifiants Stripe) avant d'exposer un pack publiquement ou côté Pro. */
export function toPublicPack(pack: AdminPartnerPack): PartnerPack {
  const { stripeProductId: _stripeProductId, stripePriceId: _stripePriceId, ...pub } = pack;
  return pub;
}

/**
 * Lit la configuration actuelle des 3 packs. Si aucune n'a encore été
 * enregistrée (première utilisation), renvoie DEFAULT_PACKS SANS l'écrire
 * en base — l'écriture n'arrive qu'au premier PATCH admin (voir
 * saveAdminPacks), pour ne jamais persister une config qu'un admin n'a pas
 * explicitement validée.
 */
export async function getAdminPacks(): Promise<AdminPartnerPack[]> {
  const setting = await prisma.globalSetting.findUnique({ where: { key: PACKS_SETTING_KEY } });
  if (!setting) return DEFAULT_PACKS;

  const value = setting.value as { packs?: AdminPartnerPack[] } | null;
  if (!value?.packs || !Array.isArray(value.packs) || value.packs.length !== 3) {
    // Valeur corrompue/inattendue : on retombe sur les valeurs par défaut
    // plutôt que de planter tout l'affichage des packs.
    return DEFAULT_PACKS;
  }
  return value.packs;
}

export async function getPublicPacks(): Promise<PartnerPack[]> {
  const packs = await getAdminPacks();
  return packs.filter((p) => p.isActive || p.tier === SubscriptionType.FREE).map(toPublicPack);
}

export async function findPack(tier: SubscriptionType): Promise<AdminPartnerPack | null> {
  const packs = await getAdminPacks();
  return packs.find((p) => p.tier === tier) ?? null;
}

/**
 * Enregistre la config complète des 3 packs (upsert dans GlobalSetting).
 * `adminUserId` alimente GlobalSetting.updatedBy, pour garder une trace de
 * qui a modifié les prix — utile en cas de litige avec un Pro.
 */
export async function saveAdminPacks(packs: AdminPartnerPack[], adminUserId: string): Promise<void> {
  // Prisma type son champ Json de façon récursive (InputJsonValue) et refuse
  // structurellement un objet TypeScript "fort" comme AdminPartnerPack[]
  // (l'enum SubscriptionType sur `tier` fait échouer la vérification —
  // erreur de build Vercel constatée : "Index signature for type 'string'
  // is missing"). Le round-trip JSON.parse(JSON.stringify(...)) produit un
  // objet JS neutre (type `any`), toujours accepté par Prisma, sans perte
  // de données puisque tous les champs de AdminPartnerPack sont déjà des
  // types JSON-safe (string/number/boolean/null/tableaux).
  const value = JSON.parse(JSON.stringify({ packs }));

  await prisma.globalSetting.upsert({
    where: { key: PACKS_SETTING_KEY },
    create: {
      key: PACKS_SETTING_KEY,
      value,
      description: "Configuration des packs partenaires (Pro) — modifiable depuis Admin > Packs Partenaires.",
      updatedBy: adminUserId,
    },
    update: {
      value,
      updatedBy: adminUserId,
    },
  });
}

/**
 * S'assure que le pack a un Prix Stripe à jour pour son `priceMonthly`
 * actuel — crée le Produit Stripe s'il n'existe pas encore, puis crée un
 * NOUVEAU Prix à chaque changement de montant (les Prix Stripe sont
 * immuables une fois créés) et archive l'ancien plutôt que de le supprimer
 * (Stripe ne permet pas de supprimer un Prix déjà utilisé — l'archiver via
 * `active: false` empêche juste de nouvelles souscriptions dessus). Les
 * abonnements déjà en cours sur l'ancien prix ne sont PAS modifiés
 * rétroactivement : c'est le comportement standard attendu (changer le
 * prix d'un pack ne doit jamais faire varier silencieusement la facture
 * d'un Pro déjà abonné).
 *
 * Ne fait rien pour le pack FREE (priceMonthly = 0, pas d'abonnement Stripe).
 */
export async function ensureStripePrice(pack: AdminPartnerPack): Promise<AdminPartnerPack> {
  if (pack.tier === SubscriptionType.FREE || pack.priceMonthly <= 0) {
    return { ...pack, stripeProductId: null, stripePriceId: null };
  }

  let productId = pack.stripeProductId;
  if (!productId) {
    const product = await stripe.products.create({
      name: `Do You Geckoo — Pack partenaire ${pack.name}`,
      metadata: { tier: pack.tier },
    });
    productId = product.id;
  }

  const newPrice = await stripe.prices.create({
    product: productId,
    currency: "eur",
    unit_amount: Math.round(pack.priceMonthly * 100),
    recurring: { interval: "month" },
    metadata: { tier: pack.tier },
  });

  if (pack.stripePriceId && pack.stripePriceId !== newPrice.id) {
    await stripe.prices.update(pack.stripePriceId, { active: false }).catch(() => {
      // Non bloquant : si l'archivage de l'ancien prix échoue (déjà
      // archivé, id invalide...), le nouveau prix est déjà en place et
      // fonctionnel, ce n'est pas une raison de faire échouer la sauvegarde.
    });
  }

  return { ...pack, stripeProductId: productId, stripePriceId: newPrice.id };
}
