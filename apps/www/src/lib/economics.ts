/**
 * Source de vérité UNIQUE pour tous les chiffres économiques affichés sur le
 * site vitrine (Hero, EconomicsComparison, Faq, llms.txt, meta description).
 *
 * Avant ce fichier, les mêmes informations étaient recopiées à la main à 4
 * endroits différents et avaient dérivé (commission commerçant citée à 10%,
 * 12% et "12 à 18%" selon la page ; rémunération livreur citée "≈7-8€",
 * "≈5-10€" et "jusqu'à 40% de plus" sans aucune source). Les valeurs
 * ci-dessous sont reprises directement des réglages qui pilotent réellement
 * la plateforme -- jamais inventées :
 *
 * - Commission commerçant : apps/api/src/lib/partnerPacks.ts (DEFAULT_PACKS)
 *   -> Découverte (FREE) 18%, Croissance (PREMIUM) 15%, Premium+ 12%.
 *   "12 à 18% selon la formule" est donc la formulation exacte, pas un
 *   arrondi -- si un pack change ces valeurs mêmes, il faut mettre à jour
 *   ici aussi (pas de lien dynamique à l'API : ce sont des composants
 *   serveur statiques au build, un affichage dynamique viendrait avec un
 *   fetch dédié si les packs changent souvent).
 *
 * - Rémunération livreur : apps/api/src/lib/pricingSettings.ts
 *   (DEFAULT_RIDER_PAY_BASE=2.5€, DEFAULT_RIDER_PAY_PER_KM=0.95€,
 *   DEFAULT_RIDER_PAY_MINIMUM=5€) -> pay = max(5, 2.5 + 0.95×distanceKm).
 *   Sur les distances typiques d'une livraison intra-Golfe (jusqu'à ~6km,
 *   la majorité des trajets), ça donne environ 5€ à 8€ -- au-delà de 10km
 *   ça peut monter à ~12€. On affiche la fourchette réaliste du quotidien
 *   (5-8€), pas la borne haute rare, pour rester honnête sur ce qu'un
 *   livreur touche "en général".
 *
 * L'ancienne affirmation "jusqu'à 40% de plus que sur les plateformes
 * classiques" (meta description) a été retirée : aucun calcul ni aucune
 * donnée dans le code ne la soutient. Tant qu'un vrai comparatif chiffré
 * (rémunération moyenne réelle sur des commandes livrées vs des données
 * publiques équivalentes côté Uber Eats/Deliveroo) n'existe pas, on ne
 * l'affirme pas.
 */

export const PLATFORM_COMMISSION = {
  /** Premium+ (meilleur taux) -- apps/api/src/lib/partnerPacks.ts, PREMIUM_PLUS.commissionRate = 0.12 */
  minPct: 12,
  /** Découverte / gratuit (taux de base) -- apps/api/src/lib/partnerPacks.ts, FREE.commissionRate = 0.18 */
  maxPct: 18,
  /** Formulation courte, utilisée partout où une seule phrase suffit. */
  shortLabel: "12 à 18% selon la formule",
  /** Formulation "meilleur cas", pour un contexte qui veut mettre en avant le plancher. */
  fromLabel: "à partir de 12%",
} as const;

export const RIDER_PAY = {
  /** apps/api/src/lib/pricingSettings.ts : base 2,50€ + 0,95€/km, minimum 5€. */
  baseEur: 2.5,
  perKmEur: 0.95,
  minimumEur: 5,
  /** Fourchette réaliste pour la majorité des trajets intra-Golfe (jusqu'à ~6km). */
  typicalLowEur: 5,
  typicalHighEur: 8,
  typicalLabel: "≈5 à 8€ selon la distance",
} as const;

/**
 * Comparatif avec les plateformes nationales -- chiffre externe, donc
 * OBLIGATOIREMENT sourcé, daté et lié (règle fixée dans le cadrage SEO/GEO).
 * Source tierce (pas un chiffre officiel Uber Eats/Deliveroo) : à
 * remplacer par une source primaire si vous en obtenez une, ou à re-vérifier
 * périodiquement -- les grilles de commission changent.
 */
export const COMPETITOR_COMMISSION_SOURCE = {
  maxPct: 30,
  platform: "Uber Eats (formule Premium, livraison par la plateforme)",
  sourceLabel: "Fooderise — Comparatif des commissions plateformes 2026",
  sourceUrl: "https://www.fooderise.com/commission-plateformes",
  accessedDate: "23 août 2026",
  caveat: "Les taux réels varient selon le contrat et le volume du commerçant.",
} as const;
