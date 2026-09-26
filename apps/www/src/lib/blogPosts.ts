/**
 * Contenu du blog SEO/GEO (26/09/2026, demande de Krys : "il faut creer des
 * articles de blog pour le referencement... ensuite met a jour le site map
 * complet et ameliore encore plus le seo et le Geo").
 *
 * Même logique que partnerContent.ts : contenu centralisé ici, jamais dupliqué
 * dans les pages. Chaque article vise une des expressions clés demandées
 * (livraison repas à domicile, livraison rapide fast food, livraison rapide
 * de vos repas, livraison repas en ligne, repas livrés rapidement, livraison
 * de vos plats préférés) combinée à une ville -- UNIQUEMENT des villes
 * réellement Active + "Page SEO indexable" dans Admin > Zones & Capacité
 * (contrôlé le 26/09/2026 : 11 villes aujourd'hui, pas seulement
 * Sainte-Maxime) -- jamais une ville présentée comme couverte sans l'être.
 *
 * Les chiffres (commission, rémunération livreur, comparatif concurrent) sont
 * IMPORTÉS depuis lib/economics.ts plutôt que recopiés -- même garde-fou que
 * partout ailleurs sur le site : une seule source de vérité, jamais un
 * chiffre en dur qui pourrait dériver.
 *
 * Noms de commerces réels (26/09/2026, idée de Krys) : quelques articles
 * citent 2-3 adresses réelles issues d'Admin > Prospection (liste de
 * commerces du Golfe pas encore inscrits sur Do You Geckoo, certains déjà
 * confirmés "vente à emporter" ou "Uber Eats"). Toujours en couleur locale
 * factuelle uniquement -- JAMAIS présentés comme partenaires ou disponibles
 * sur Do You Geckoo puisqu'aucun ne l'est (0 inscrits au 26/09/2026) : ce
 * serait à la fois inexact et risqué (sous-entendu d'affiliation non
 * consentie). L'intérêt est double : renforcer la pertinence locale du
 * contenu (entités réelles reconnues par Google) et une exposition indirecte
 * si le commerçant tape son propre nom.
 */

import { PLATFORM_COMMISSION, RIDER_PAY, COMPETITOR_COMMISSION_SOURCE } from "./economics";

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "list"; items: string[] };

export interface BlogPost {
  slug: string;
  title: string;
  /** Utilisé pour le <title> (SERP) -- volontairement plus court que title quand title est long. */
  metaTitle?: string;
  description: string;
  keywords: string[];
  /** ISO (YYYY-MM-DD). */
  publishedAt: string;
  excerpt: string;
  body: BlogBlock[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "livraison-repas-domicile-sainte-maxime",
    title: "Livraison de repas à domicile à Sainte-Maxime : le guide complet",
    description:
      "Comment fonctionne la livraison de repas à domicile à Sainte-Maxime avec Do You Geckoo : commerces disponibles, délais, prix et différences avec les grandes plateformes.",
    keywords: [
      "livraison repas à domicile",
      "livraison Sainte-Maxime",
      "livraison locale",
      "livraison à domicile",
      "livraison de courses à domicile",
      "restaurant livré rapidement",
    ],
    publishedAt: "2026-09-22",
    excerpt:
      "Commander à manger sans sortir de chez soi, livré par un livreur du coin : voici comment ça marche concrètement à Sainte-Maxime.",
    body: [
      {
        type: "p",
        text: "À Sainte-Maxime, la livraison de repas à domicile ne se limite plus aux grandes enseignes nationales. Do You Geckoo connecte directement les commerçants du Golfe de Saint-Tropez, les clients et des livreurs indépendants locaux, pour une livraison pensée pour le territoire plutôt que calquée sur un modèle national.",
      },
      {
        type: "p",
        text: "La ville ne manque pas d'adresses appréciées — du Café de France à La Gruppi en passant par Pizzas Manon — révélatrices d'une scène locale déjà bien vivante, avec ou sans livraison.",
      },
      { type: "h2", text: "Comment fonctionne la livraison de repas à domicile avec Do You Geckoo ?" },
      {
        type: "list",
        items: [
          "Parcourez les commerçants partenaires de Sainte-Maxime, par catégorie ou par nom.",
          "Composez votre commande et réglez en ligne, en toute sécurité.",
          "Le commerçant prépare votre commande, un livreur local vient la récupérer.",
          "Vous suivez la livraison en direct sur la carte, jusqu'à réception — comptez généralement 20 à 30 minutes.",
        ],
      },
      { type: "h2", text: "Quels commerces sont livrés à domicile ?" },
      {
        text:
          "Le réseau de commerçants partenaires couvre plusieurs catégories : restaurants, boulangeries, boucheries, épiceries fines, fleuristes, pharmacies et plus encore. La liste évolue avec les nouvelles inscriptions — le plus simple reste de parcourir la page des commerçants pour voir l'offre réellement disponible aujourd'hui à Sainte-Maxime.",
        type: "p",
      },
      { type: "h2", text: "Pourquoi une livraison locale plutôt qu'une grande plateforme nationale ?" },
      {
        type: "p",
        text: `Sur les plateformes de livraison classiques, la commission prélevée aux commerçants peut grimper jusqu'à ${COMPETITOR_COMMISSION_SOURCE.maxPct}% (${COMPETITOR_COMMISSION_SOURCE.platform} — source : ${COMPETITOR_COMMISSION_SOURCE.sourceLabel}, consulté le ${COMPETITOR_COMMISSION_SOURCE.accessedDate}). Do You Geckoo applique une commission de ${PLATFORM_COMMISSION.shortLabel}, sans rien changer au prix payé par le client : la différence reste dans la poche du commerçant local et du livreur, pas dans celle d'une plateforme internationale.`,
      },
      {
        type: "p",
        text: "Envie de tester ? Parcourez les commerçants partenaires de Sainte-Maxime et passez votre première commande en quelques minutes.",
      },
    ],
  },
  {
    slug: "livraison-rapide-fast-food-sainte-maxime",
    title: "Livraison rapide : un repas vite prêt, vite livré à Sainte-Maxime",
    metaTitle: "Livraison rapide fast-food à Sainte-Maxime",
    description:
      "Envie d'un repas rapide sans faire la cuisine ? Voici ce que change une livraison rapide et locale à Sainte-Maxime, entre délais réels et commerces disponibles.",
    keywords: [
      "livraison rapide fast food",
      "repas livrés rapidement",
      "livraison rapide",
      "livraison Sainte-Maxime",
      "commande de repas en ligne",
      "application de livraison locale",
    ],
    publishedAt: "2026-09-23",
    excerpt: "Pas envie de cuisiner ce soir ? Voici ce à quoi ressemble vraiment une livraison rapide à Sainte-Maxime.",
    body: [
      {
        type: "p",
        text: "Un repas vite prêt, vite livré : c'est souvent ce qu'on cherche un soir de semaine ou après une journée à la plage. À Sainte-Maxime, la livraison rapide ne veut pas dire livraison anonyme — un livreur local vient récupérer votre commande directement chez le commerçant qui vient de la préparer.",
      },
      { type: "h2", text: "À quoi s'attendre en termes de délai" },
      {
        type: "list",
        items: [
          "Commande passée en ligne, en quelques clics, sans création de compte obligatoire pour parcourir l'offre.",
          "Préparation par le commerçant, suivie en direct sur la carte dès que le livreur prend en charge la commande.",
          "Délai typique : 20 à 30 minutes entre la validation de la commande et la réception.",
        ],
      },
      { type: "h2", text: "Quels repas rapides trouver ?" },
      {
        type: "p",
        text: "L'offre dépend des commerçants inscrits à un instant donné — burgers, pizzas, sandwichs ou plats du jour selon les restaurants partenaires de Sainte-Maxime. Plutôt que d'annoncer une liste figée qui vieillirait mal, le plus fiable est de consulter la page des commerçants pour voir ce qui est réellement disponible aujourd'hui.",
      },
      { type: "h2", text: "Ce qui change par rapport aux grandes enseignes de livraison rapide" },
      {
        type: "p",
        text: `Chez Do You Geckoo, un livreur touche en général ${RIDER_PAY.typicalLabel} par course (base ${RIDER_PAY.baseEur}€ + ${RIDER_PAY.perKmEur}€/km, minimum garanti ${RIDER_PAY.minimumEur}€), et le commerçant reverse une commission de ${PLATFORM_COMMISSION.shortLabel} — sans surcoût pour vous. La rapidité ne se fait donc pas au détriment de celui qui prépare le repas ni de celui qui vous le livre.`,
      },
    ],
  },
  {
    slug: "livraison-rapide-repas-comparatif-commissions",
    title: "Livraison rapide de vos repas : ce que cache la commission des plateformes",
    description:
      "Combien coûte réellement une livraison de repas pour un commerçant et pour un livreur ? Comparatif chiffré et sourcé entre Do You Geckoo et les grandes plateformes.",
    keywords: [
      "livraison rapide de vos repas",
      "comparatif livraison repas",
      "commission livraison",
      "livraison locale",
      "meilleure livraison locale",
      "livreur indépendant",
    ],
    publishedAt: "2026-09-24",
    excerpt:
      "Derrière chaque livraison rapide, il y a une commission prélevée au commerçant et une rémunération versée au livreur. Voici les chiffres, sourcés.",
    body: [
      {
        type: "p",
        text: "Une livraison rapide de vos repas a un coût, réparti différemment selon la plateforme choisie par le commerçant. Ce coût ne se voit pas toujours sur le prix affiché au client, mais il détermine directement ce que gagnent le commerçant et le livreur sur chaque commande.",
      },
      { type: "h2", text: "Combien coûte une livraison pour le commerçant ?" },
      {
        type: "p",
        text: `Do You Geckoo applique une commission de ${PLATFORM_COMMISSION.shortLabel} selon le pack choisi par le commerçant. À titre de comparaison, ${COMPETITOR_COMMISSION_SOURCE.platform} peut prélever jusqu'à ${COMPETITOR_COMMISSION_SOURCE.maxPct}% (source : ${COMPETITOR_COMMISSION_SOURCE.sourceLabel}, consulté le ${COMPETITOR_COMMISSION_SOURCE.accessedDate}, ${COMPETITOR_COMMISSION_SOURCE.sourceUrl}). ${COMPETITOR_COMMISSION_SOURCE.caveat}`,
      },
      { type: "h2", text: "Et le livreur, dans tout ça ?" },
      {
        type: "p",
        text: `Sur la majorité des trajets intra-Golfe, un livreur Do You Geckoo touche ${RIDER_PAY.typicalLabel} par course, calculé simplement : ${RIDER_PAY.baseEur}€ de base plus ${RIDER_PAY.perKmEur}€ par kilomètre, avec un minimum garanti de ${RIDER_PAY.minimumEur}€ même sur une très courte distance.`,
      },
      { type: "h2", text: "Le prix payé par le client change-t-il ?" },
      {
        type: "p",
        text: "Non — la différence de commission ne se répercute pas sur le prix affiché au client. Elle détermine simplement ce qui reste au commerçant local et au livreur une fois la commande livrée, plutôt que ce qui part vers une plateforme internationale.",
      },
      {
        type: "p",
        text: "Le détail complet du modèle économique, avec toutes les sources, est disponible sur la page dédiée à notre modèle.",
      },
    ],
  },
  {
    slug: "commander-repas-en-ligne-sainte-maxime",
    title: "Commander vos repas en ligne à Sainte-Maxime : mode d'emploi",
    description:
      "Guide pas à pas pour commander vos repas en ligne à Sainte-Maxime avec Do You Geckoo : parcourir les commerçants, payer et suivre sa livraison en direct.",
    keywords: [
      "livraison repas en ligne",
      "commander en ligne",
      "livraison Sainte-Maxime",
      "application de livraison locale",
      "livraison de courses à domicile",
    ],
    publishedAt: "2026-09-25",
    excerpt: "De la sélection du commerçant à la réception du repas : voici comment commander en ligne à Sainte-Maxime.",
    body: [
      {
        type: "p",
        text: "Commander ses repas en ligne devrait être aussi simple que rapide. Voici, étape par étape, comment ça se passe concrètement avec Do You Geckoo à Sainte-Maxime.",
      },
      { type: "h2", text: "Les étapes pour commander" },
      {
        type: "list",
        items: [
          "Ouvrez l'application Client (accessible directement depuis un navigateur, sans passer par un store).",
          "Parcourez les commerçants par catégorie — restaurants, boulangeries, boucheries, épiceries fines, fleuristes et plus.",
          "Composez votre commande, ajoutez vos options, et réglez en ligne en toute sécurité.",
          "Suivez votre livraison en direct sur la carte, du commerçant jusqu'à votre porte.",
        ],
      },
      { type: "h2", text: "Disponible directement depuis votre navigateur" },
      {
        type: "p",
        text: "Pas besoin de passer par l'App Store ou Google Play pour commencer : l'application Client fonctionne directement dans votre navigateur, et peut ensuite être ajoutée à votre écran d'accueil pour une expérience proche d'une application installée.",
      },
      { type: "h2", text: "Suivi en temps réel, jusqu'à la porte" },
      {
        type: "p",
        text: "Une fois la commande prise en charge par un livreur, sa position est visible en direct sur la carte — de quoi savoir précisément quand se préparer à réceptionner sa commande, sans avoir à deviner.",
      },
    ],
  },
  {
    slug: "livraison-plats-preferes-golfe-saint-tropez",
    title: "Vos plats préférés livrés dans le Golfe de Saint-Tropez",
    description:
      "Do You Geckoo livre vos plats préférés à Sainte-Maxime et prépare son extension au reste du Golfe de Saint-Tropez, avec une approche 100% locale.",
    keywords: [
      "livraison de vos plats préférés",
      "Golfe de Saint-Tropez",
      "livraison locale",
      "livreur indépendant Golfe de Saint-Tropez",
      "livraison locale Var",
    ],
    publishedAt: "2026-09-26",
    excerpt:
      "Un plat qu'on aime, livré par quelqu'un du coin plutôt que par un système anonyme : c'est le pari de Do You Geckoo dans le Golfe de Saint-Tropez.",
    body: [
      {
        type: "p",
        text: "Retrouver ses plats préférés sans avoir à se déplacer, livrés par un livreur qui connaît le secteur : c'est l'idée derrière Do You Geckoo, pensée dès le départ pour le Golfe de Saint-Tropez plutôt qu'adaptée d'un modèle générique.",
      },
      { type: "h2", text: "Sainte-Maxime aujourd'hui, le Golfe de Saint-Tropez demain" },
      {
        type: "p",
        text: "Le service est réellement actif à Sainte-Maxime aujourd'hui : commerçants référencés, livreurs disponibles, commandes livrées en 20 à 30 minutes. Le projet est conçu pour s'étendre progressivement aux communes voisines du Golfe de Saint-Tropez — sans jamais annoncer une couverture qui ne serait pas encore réelle.",
      },
      { type: "h2", text: "Une approche locale, du commerçant au livreur" },
      {
        type: "list",
        items: [
          "Des commerçants indépendants du Golfe, pas une chaîne nationale.",
          "Des livreurs du secteur, rémunérés en général entre 5 et 8€ par course.",
          "Une commission commerçant plus basse que sur les grandes plateformes, sans surcoût pour le client.",
        ],
      },
      { type: "h2", text: "Envie de retrouver vos commerçants préférés ?" },
      {
        type: "p",
        text: "Parcourez la liste des commerçants partenaires, ou si vous êtes commerçant ou livreur dans le Golfe de Saint-Tropez, rejoignez le réseau dès maintenant.",
      },
    ],
  },

  // -- Autres communes du Golfe (26/09/2026, demande de Krys : "fais les
  // autres villes du golfe aussi de la meme facon") -- AUCUNE de ces villes
  // n'est active aujourd'hui (voir lib/economics.ts / layout.tsx : seule
  // Sainte-Maxime l'est), donc chaque article suit EXACTEMENT le même
  // cadrage honnête que /livraison/[ville]/page.tsx pour une ville non
  // active : jamais "commandez maintenant à [Ville]", toujours "bientôt" /
  // "en préparation", avec Sainte-Maxime citée comme preuve que le modèle
  // fonctionne déjà. Angle local différent à chaque fois pour éviter 4 pages
  // quasi identiques (voir garde-fou "thin content" du référencement local).
  {
    // CORRIGÉ le 26/09/2026 (contrôle direct dans Admin > Zones & Capacité,
    // demande de Krys "tu peux faire pour toutes les villes inscrites") :
    // Saint-Tropez est en réalité déjà marquée Active + "Page SEO indexable"
    // dans Admin, comme Sainte-Maxime -- l'article rédigé initialement
    // ("bientôt disponible") était donc inexact et affirmait le contraire de
    // la réalité. Reformulé au présent, toujours sans jamais lister de
    // commerçant précis non vérifié.
    slug: "livraison-repas-domicile-saint-tropez",
    title: "Livraison de repas à domicile à Saint-Tropez avec Do You Geckoo",
    description:
      "Do You Geckoo livre vos repas à domicile à Saint-Tropez : commerçants locaux, livraison en 20 à 30 minutes, commission plus juste qu'une grande plateforme.",
    keywords: [
      "livraison repas à domicile Saint-Tropez",
      "livraison Saint-Tropez",
      "livraison de vos plats préférés",
      "restaurant livré rapidement",
      "livreur indépendant",
    ],
    publishedAt: "2026-09-27",
    excerpt: "Saint-Tropez fait partie des villes actives du réseau Do You Geckoo — voici ce que ça change pour commander.",
    body: [
      {
        type: "p",
        text: "Entre résidents à l'année et visiteurs, Saint-Tropez concentre une forte densité de restaurants et de commerces — et donc une vraie demande pour la livraison de repas à domicile, toute l'année et pas seulement en haute saison.",
      },
      {
        type: "p",
        text: "Difficile de résumer la scène culinaire tropézienne en quelques noms, mais des adresses comme La Tarte Tropézienne, Palmito ou Rolls Café donnent une idée de la diversité déjà présente en ville.",
      },
      { type: "h2", text: "Le service est actif à Saint-Tropez" },
      {
        type: "p",
        text: "Saint-Tropez fait partie des villes du Golfe où la vérification de zone de Do You Geckoo est activée : une commande y est acceptée dès lors qu'un commerçant partenaire et un livreur disponible s'y trouvent. La liste des commerçants réellement référencés évolue avec les inscriptions — le plus fiable reste de la consulter directement.",
      },
      { type: "h2", text: "Ce que change le modèle Do You Geckoo à Saint-Tropez" },
      {
        type: "list",
        items: [
          "Des commerçants et restaurateurs locaux qui gardent une plus grande part de chaque commande.",
          "Des livreurs indépendants du secteur, rémunérés en général entre 5 et 8€ par course.",
          "Une livraison suivie en direct sur la carte, généralement en 20 à 30 minutes.",
        ],
      },
      { type: "h2", text: "Restaurateurs et livreurs de Saint-Tropez" },
      {
        type: "p",
        text: "Rejoindre le réseau se fait directement en ligne, sans passer par une grande plateforme nationale — de quoi garder une part plus juste de chaque commande.",
      },
    ],
  },
  {
    // CORRIGÉ le 26/09/2026, même raison que Saint-Tropez ci-dessus : Grimaud
    // (village + Port Grimaud) est Active + indexable dans Admin > Zones &
    // Capacité.
    slug: "livraison-repas-domicile-grimaud",
    title: "Livraison de repas à domicile à Grimaud avec Do You Geckoo",
    description:
      "De Grimaud village à Port Grimaud, Do You Geckoo livre vos repas et vos courses à domicile avec des commerçants et livreurs locaux.",
    keywords: [
      "livraison repas à domicile Grimaud",
      "livraison Grimaud",
      "livraison de courses à domicile",
      "commande de repas en ligne",
      "livraison rapide",
    ],
    publishedAt: "2026-09-28",
    excerpt: "Entre village perché et bord de mer, voici comment fonctionne la livraison locale à Grimaud.",
    body: [
      {
        type: "p",
        text: "Grimaud, c'est deux visages : le village perché avec ses commerces de proximité, et la zone côtière autour de Port Grimaud. Une livraison de repas à domicile pensée pour Grimaud doit composer avec cette double réalité — ce n'est pas qu'une question de restaurants, mais aussi de boulangeries, boucheries et épiceries locales.",
      },
      {
        type: "p",
        text: "Côté village, des adresses comme La Grimaudoise, Don Peppe ou la Crêperie Le Boubou font partie du paysage commerçant local — un aperçu de ce qui existe déjà à Grimaud.",
      },
      { type: "h2", text: "Le service est actif à Grimaud" },
      {
        type: "p",
        text: "Grimaud fait partie des villes du Golfe activées côté zone de livraison. Une commande y est acceptée dès qu'un commerçant partenaire et un livreur disponible s'y trouvent — la liste des commerçants référencés est consultable directement, du village au port.",
      },
      { type: "h2", text: "Ce que ça change concrètement" },
      {
        type: "list",
        items: [
          "Commerçants et restaurateurs de Grimaud référencés sur une plateforme locale, pas une chaîne nationale.",
          "Livraison de courses à domicile — pas seulement des repas — via le même réseau de livreurs indépendants.",
          "Une commission commerçant plus basse que sur les grandes plateformes, sans surcoût pour le client.",
        ],
      },
      { type: "h2", text: "Commerçant ou livreur à Grimaud ?" },
      {
        type: "p",
        text: "L'inscription se fait en ligne, sans engagement de durée côté commerçant, et avec des horaires libres côté livreur.",
      },
    ],
  },
  {
    // CORRIGÉ le 26/09/2026, même raison : Cogolin est Active + indexable.
    slug: "livraison-rapide-cogolin",
    title: "Livraison rapide à Cogolin avec Do You Geckoo",
    description:
      "Do You Geckoo livre repas et commerces locaux à Cogolin, en 20 à 30 minutes, avec des livreurs indépendants du secteur.",
    keywords: [
      "livraison rapide Cogolin",
      "livraison Cogolin",
      "livraison rapide fast food",
      "application de livraison locale",
      "livreur indépendant",
    ],
    publishedAt: "2026-09-29",
    excerpt: "Cogolin, ville de l'arrière-pays du Golfe, fait partie des villes actives de Do You Geckoo.",
    body: [
      {
        type: "p",
        text: "Connue pour son artisanat local (pipes, bouchons et tapis de Cogolin), la ville a aussi ses restaurants et commerces du quotidien — et donc, comme partout dans le Golfe, une vraie demande pour une livraison rapide et locale.",
      },
      {
        type: "p",
        text: "Le Petit Sushi, L'Atelier Provençal ou La Maison du Boulanger font partie des adresses que l'on croise en se promenant à Cogolin, à l'image d'un commerce local varié.",
      },
      { type: "h2", text: "Le service est actif à Cogolin" },
      {
        type: "p",
        text: "Cogolin fait partie des villes du Golfe activées côté zone de livraison. La liste des commerçants réellement référencés évolue avec les inscriptions — le plus fiable reste de la consulter directement plutôt que de se fier à une liste figée.",
      },
      { type: "h2", text: "Ce que le modèle Do You Geckoo apporte à Cogolin" },
      {
        type: "list",
        items: [
          "Des commerçants locaux qui gardent une plus grande part de chaque commande.",
          "Des livreurs indépendants du secteur, rémunérés en général entre 5 et 8€ par course.",
          "Une application de livraison locale, pensée pour le Golfe plutôt que copiée d'un modèle générique.",
        ],
      },
      { type: "h2", text: "Vous êtes commerçant ou livreur à Cogolin ?" },
      {
        type: "p",
        text: "L'inscription se fait directement en ligne, avec une validation sous 24 à 48h.",
      },
    ],
  },
  {
    // Port Grimaud n'est pas une commune distincte (c'est un quartier/port de
    // la commune de Grimaud, elle-même Active côté Admin) -- l'article garde
    // son angle local propre (canaux, piéton) mais ne prétend plus à un statut
    // "bientôt" séparé de celui de Grimaud.
    slug: "livraison-repas-en-ligne-port-grimaud",
    title: "Livraison de repas en ligne à Port Grimaud avec Do You Geckoo",
    description:
      "Port Grimaud, quartier de la commune de Grimaud, est couvert par Do You Geckoo : livraison de repas en ligne par des livreurs qui connaissent le secteur.",
    keywords: [
      "livraison repas en ligne Port-Grimaud",
      "livraison Port-Grimaud",
      "livraison rapide de vos repas",
      "restaurant livré rapidement",
      "livraison locale",
    ],
    publishedAt: "2026-09-30",
    excerpt: "Ruelles piétonnes et canaux : la livraison à Port Grimaud a ses propres contraintes, bien connues des livreurs du secteur.",
    body: [
      {
        type: "p",
        text: "Surnommé la \"Venise provençale\", Port Grimaud est largement piéton, organisé autour de ses canaux plutôt que de rues classiques. Une livraison de repas en ligne y demande une vraie connaissance du terrain — exactement ce qu'apporte un réseau de livreurs locaux plutôt qu'un algorithme générique.",
      },
      {
        type: "p",
        text: "Le long des quais, des adresses comme Le Pic Nic, La Table du Mareyeur ou Pizza Italia font partie du paysage du port — un aperçu de la vie commerçante propre à ce quartier de Grimaud.",
      },
      { type: "h2", text: "Le service couvre Port Grimaud" },
      {
        type: "p",
        text: "Port Grimaud fait partie de la commune de Grimaud, elle-même activée côté zone de livraison Do You Geckoo. Les livreurs du secteur savent circuler à pied ou en deux-roues le long des quais, là où un livreur venu d'ailleurs perdrait du temps à chercher son chemin.",
      },
      { type: "h2", text: "Ce que ça apporte à Port Grimaud" },
      {
        type: "list",
        items: [
          "Des livreurs du secteur, habitués aux ruelles et aux quais piétons.",
          "Des commerçants et restaurateurs locaux qui gardent une plus grande part de chaque commande.",
          "Un suivi de livraison en direct sur la carte, du commerçant jusqu'à votre ponton ou votre porte.",
        ],
      },
      { type: "h2", text: "Commerçant ou livreur à Port Grimaud ?" },
      {
        type: "p",
        text: "Les inscriptions commerçant et livreur se font en ligne, quel que soit votre secteur dans la commune de Grimaud.",
      },
    ],
  },
  {
    slug: "livraison-repas-domicile-les-issambres",
    title: "Livraison de repas à domicile aux Issambres avec Do You Geckoo",
    description:
      "Do You Geckoo livre vos repas à domicile aux Issambres, entre criques et plages, avec des commerçants et livreurs du secteur.",
    keywords: [
      "livraison repas à domicile Les Issambres",
      "livraison Les Issambres",
      "livraison repas en ligne",
      "livraison locale",
    ],
    publishedAt: "2026-10-01",
    excerpt: "Village côtier entre Sainte-Maxime et Fréjus, Les Issambres fait partie des villes actives de Do You Geckoo.",
    body: [
      {
        type: "p",
        text: "Avec ses criques et ses plages en balcon sur la mer, Les Issambres est un village où l'on aime autant profiter du bord de mer que rester chez soi le soir — et se faire livrer plutôt que ressortir.",
      },
      { type: "h2", text: "Le service est actif aux Issambres" },
      {
        type: "p",
        text: "Les Issambres fait partie des villes du Golfe activées côté zone de livraison Do You Geckoo : commande acceptée dès qu'un commerçant partenaire et un livreur disponible s'y trouvent.",
      },
      { type: "h2", text: "Ce que change le modèle Do You Geckoo" },
      {
        type: "list",
        items: [
          "Des commerçants locaux qui gardent une plus grande part de chaque commande.",
          "Des livreurs indépendants du secteur, rémunérés en général entre 5 et 8€ par course.",
          "Une livraison suivie en direct sur la carte, généralement en 20 à 30 minutes.",
        ],
      },
      { type: "h2", text: "Commerçant ou livreur aux Issambres ?" },
      {
        type: "p",
        text: "L'inscription se fait en ligne, avec une validation manuelle sous 24 à 48h.",
      },
    ],
  },
  {
    slug: "livraison-repas-domicile-gassin",
    title: "Livraison de repas à domicile à Gassin avec Do You Geckoo",
    description:
      "Village perché classé parmi les plus beaux de France, Gassin est desservi par Do You Geckoo : livraison de repas et commerces locaux.",
    keywords: [
      "livraison repas à domicile Gassin",
      "livraison Gassin",
      "livraison de vos plats préférés",
      "livraison locale",
    ],
    publishedAt: "2026-10-02",
    excerpt: "Village perché entre vignes et golfe, Gassin fait partie des villes actives du réseau Do You Geckoo.",
    body: [
      {
        type: "p",
        text: "Village perché entouré de vignes de Côtes de Provence, Gassin offre un cadre où les commerces sont dispersés entre le village et la plaine — un contexte où une livraison locale, assurée par un livreur qui connaît vraiment le secteur, fait une vraie différence.",
      },
      {
        type: "p",
        text: "Entre le village et la plaine, des adresses comme Easy Sushi, Gustaveur ou La Ciboulette illustrent la diversité des commerces déjà présents à Gassin.",
      },
      { type: "h2", text: "Le service est actif à Gassin" },
      {
        type: "p",
        text: "Gassin fait partie des villes du Golfe activées côté zone de livraison. La liste des commerçants référencés évolue avec les inscriptions — à consulter directement pour voir l'offre du moment.",
      },
      { type: "h2", text: "Ce que change le modèle Do You Geckoo" },
      {
        type: "list",
        items: [
          "Des commerçants locaux qui gardent une plus grande part de chaque commande.",
          "Des livreurs indépendants du secteur, rémunérés en général entre 5 et 8€ par course.",
          "Une commission commerçant plus basse que sur les grandes plateformes, sans surcoût pour le client.",
        ],
      },
      { type: "h2", text: "Commerçant ou livreur à Gassin ?" },
      {
        type: "p",
        text: "L'inscription se fait en ligne, sans engagement côté commerçant, avec des horaires libres côté livreur.",
      },
    ],
  },
  {
    slug: "livraison-rapide-ramatuelle",
    title: "Livraison rapide à Ramatuelle avec Do You Geckoo",
    description:
      "Do You Geckoo livre repas et commerces locaux à Ramatuelle, village perché proche des plages de Pampelonne, en 20 à 30 minutes.",
    keywords: [
      "livraison rapide Ramatuelle",
      "livraison Ramatuelle",
      "repas livrés rapidement",
      "livraison locale",
    ],
    publishedAt: "2026-10-03",
    excerpt: "Entre village perché et plages de Pampelonne, Ramatuelle fait partie des villes actives de Do You Geckoo.",
    body: [
      {
        type: "p",
        text: "Ramatuelle partage avec Gassin ce charme de village perché, tout en étant la porte d'entrée vers les plages de Pampelonne — deux visages bien différents, qui appellent la même envie : un repas livré rapidement sans avoir à sortir.",
      },
      {
        type: "p",
        text: "La Grignote, l'Atelier de la Forge ou la Boulangerie Pâtisserie Au Cœur de Ramatuelle font partie des adresses qui animent le village toute l'année.",
      },
      { type: "h2", text: "Le service est actif à Ramatuelle" },
      {
        type: "p",
        text: "Ramatuelle fait partie des villes du Golfe activées côté zone de livraison Do You Geckoo. Une commande y est acceptée dès qu'un commerçant partenaire et un livreur disponible s'y trouvent.",
      },
      { type: "h2", text: "Ce que change le modèle Do You Geckoo" },
      {
        type: "list",
        items: [
          "Des commerçants et restaurateurs locaux qui gardent une plus grande part de chaque commande.",
          "Des livreurs indépendants du secteur, rémunérés en général entre 5 et 8€ par course.",
          "Une livraison suivie en direct sur la carte, généralement en 20 à 30 minutes.",
        ],
      },
      { type: "h2", text: "Commerçant ou livreur à Ramatuelle ?" },
      {
        type: "p",
        text: "L'inscription se fait en ligne, avec une validation manuelle sous 24 à 48h.",
      },
    ],
  },
  {
    slug: "livraison-repas-domicile-la-croix-valmer",
    title: "Livraison de repas à domicile à La Croix-Valmer avec Do You Geckoo",
    description:
      "Do You Geckoo livre vos repas à domicile à La Croix-Valmer, entre plages et vignobles, avec des commerçants et livreurs locaux.",
    keywords: [
      "livraison repas à domicile La Croix-Valmer",
      "livraison La Croix-Valmer",
      "livraison repas en ligne",
      "livraison locale",
    ],
    publishedAt: "2026-10-04",
    excerpt: "Entre plages et vignobles, La Croix-Valmer fait partie des villes actives du réseau Do You Geckoo.",
    body: [
      {
        type: "p",
        text: "Plus tranquille que sa voisine Saint-Tropez, La Croix-Valmer conjugue plages et vignobles — un cadre où la livraison de repas à domicile permet de profiter de la soirée sans avoir à reprendre la voiture.",
      },
      {
        type: "p",
        text: "Le Patio, la Boulangerie des Palmiers ou Le Petit Gigaro font partie des adresses appréciées du secteur, entre le village et le littoral.",
      },
      { type: "h2", text: "Le service est actif à La Croix-Valmer" },
      {
        type: "p",
        text: "La Croix-Valmer fait partie des villes du Golfe activées côté zone de livraison. La liste des commerçants référencés évolue avec les inscriptions — à consulter directement pour voir l'offre du moment.",
      },
      { type: "h2", text: "Ce que change le modèle Do You Geckoo" },
      {
        type: "list",
        items: [
          "Des commerçants locaux qui gardent une plus grande part de chaque commande.",
          "Des livreurs indépendants du secteur, rémunérés en général entre 5 et 8€ par course.",
          "Une commission commerçant plus basse que sur les grandes plateformes, sans surcoût pour le client.",
        ],
      },
      { type: "h2", text: "Commerçant ou livreur à La Croix-Valmer ?" },
      {
        type: "p",
        text: "L'inscription se fait en ligne, sans engagement côté commerçant, avec des horaires libres côté livreur.",
      },
    ],
  },
  {
    slug: "livraison-repas-domicile-plan-de-la-tour",
    title: "Livraison de repas à domicile au Plan-de-la-Tour avec Do You Geckoo",
    description:
      "Do You Geckoo livre vos repas et vos courses à domicile au Plan-de-la-Tour, village de l'arrière-pays du Golfe de Saint-Tropez.",
    keywords: [
      "livraison repas à domicile Plan-de-la-Tour",
      "livraison Plan-de-la-Tour",
      "livraison de courses à domicile",
      "livraison locale",
    ],
    publishedAt: "2026-10-05",
    excerpt: "Village de l'arrière-pays entouré de forêts de chênes-lièges, Le Plan-de-la-Tour fait partie des villes actives de Do You Geckoo.",
    body: [
      {
        type: "p",
        text: "Plus rural que les communes du littoral, Le Plan-de-la-Tour est entouré de forêts de chênes-lièges — un village où l'on est parfois plus loin d'un restaurant qu'en bord de mer, et où une livraison locale prend tout son sens.",
      },
      {
        type: "p",
        text: "Chez Bastianin, la Tarte Tropézienne du centre-village ou Le Comptoir de la Poste font partie des adresses qui font vivre le village.",
      },
      { type: "h2", text: "Le service est actif au Plan-de-la-Tour" },
      {
        type: "p",
        text: "Le Plan-de-la-Tour fait partie des villes du Golfe activées côté zone de livraison Do You Geckoo. La liste des commerçants référencés évolue avec les inscriptions — à consulter directement.",
      },
      { type: "h2", text: "Ce que change le modèle Do You Geckoo" },
      {
        type: "list",
        items: [
          "Des commerçants locaux qui gardent une plus grande part de chaque commande.",
          "Livraison de courses à domicile — pas seulement des repas — via le même réseau de livreurs indépendants.",
          "Des livreurs indépendants du secteur, rémunérés en général entre 5 et 8€ par course.",
        ],
      },
      { type: "h2", text: "Commerçant ou livreur au Plan-de-la-Tour ?" },
      {
        type: "p",
        text: "L'inscription se fait en ligne, avec une validation manuelle sous 24 à 48h.",
      },
    ],
  },
  {
    slug: "livraison-rapide-cavalaire-sur-mer",
    title: "Livraison rapide à Cavalaire-sur-Mer avec Do You Geckoo",
    description:
      "Do You Geckoo livre repas et commerces locaux à Cavalaire-sur-Mer, station balnéaire familiale du Golfe de Saint-Tropez, en 20 à 30 minutes.",
    keywords: [
      "livraison rapide Cavalaire-sur-Mer",
      "livraison Cavalaire-sur-Mer",
      "repas livrés rapidement",
      "livraison locale",
    ],
    publishedAt: "2026-10-06",
    excerpt: "Station balnéaire familiale au fond du Golfe, Cavalaire-sur-Mer fait partie des villes actives de Do You Geckoo.",
    body: [
      {
        type: "p",
        text: "Avec sa grande plage de sable et son port de plaisance, Cavalaire-sur-Mer attire familles et résidents à l'année — et avec eux, une vraie demande pour une livraison rapide, aussi bien en soirée d'été qu'un soir d'hiver tranquille.",
      },
      { type: "h2", text: "Le service est actif à Cavalaire-sur-Mer" },
      {
        type: "p",
        text: "Cavalaire-sur-Mer fait partie des villes du Golfe activées côté zone de livraison Do You Geckoo. Une commande y est acceptée dès qu'un commerçant partenaire et un livreur disponible s'y trouvent.",
      },
      { type: "h2", text: "Ce que change le modèle Do You Geckoo" },
      {
        type: "list",
        items: [
          "Des commerçants et restaurateurs locaux qui gardent une plus grande part de chaque commande.",
          "Des livreurs indépendants du secteur, rémunérés en général entre 5 et 8€ par course.",
          "Une livraison suivie en direct sur la carte, généralement en 20 à 30 minutes.",
        ],
      },
      { type: "h2", text: "Commerçant ou livreur à Cavalaire-sur-Mer ?" },
      {
        type: "p",
        text: "L'inscription se fait en ligne, avec une validation manuelle sous 24 à 48h.",
      },
    ],
  },
  {
    slug: "livraison-repas-domicile-la-mole",
    title: "Livraison de repas à domicile à La Môle avec Do You Geckoo",
    description:
      "Do You Geckoo livre vos repas à domicile à La Môle, village de l'arrière-pays du Golfe de Saint-Tropez, avec des livreurs du secteur.",
    keywords: [
      "livraison repas à domicile La Môle",
      "livraison La Môle",
      "livraison repas en ligne",
      "livraison locale",
    ],
    publishedAt: "2026-10-07",
    excerpt: "Petit village de l'arrière-pays connu pour son marché aux truffes, La Môle fait partie des villes actives de Do You Geckoo.",
    body: [
      {
        type: "p",
        text: "Village discret de l'arrière-pays, La Môle est surtout connue pour son marché aux truffes traditionnel — et, comme dans les autres villages du Golfe éloignés du littoral, une livraison locale y comble un vrai manque de commerces à proximité immédiate.",
      },
      {
        type: "p",
        text: "L'Auberge de la Mole, Le Bistrot Gourmet ou la Boulangerie-Pâtisserie Martial font partie des adresses qui animent ce petit village.",
      },
      { type: "h2", text: "Le service est actif à La Môle" },
      {
        type: "p",
        text: "La Môle fait partie des villes du Golfe activées côté zone de livraison Do You Geckoo. La liste des commerçants référencés évolue avec les inscriptions — à consulter directement pour voir l'offre du moment.",
      },
      { type: "h2", text: "Ce que change le modèle Do You Geckoo" },
      {
        type: "list",
        items: [
          "Des commerçants locaux qui gardent une plus grande part de chaque commande.",
          "Des livreurs indépendants du secteur, rémunérés en général entre 5 et 8€ par course.",
          "Une commission commerçant plus basse que sur les grandes plateformes, sans surcoût pour le client.",
        ],
      },
      { type: "h2", text: "Commerçant ou livreur à La Môle ?" },
      {
        type: "p",
        text: "L'inscription se fait en ligne, sans engagement côté commerçant, avec des horaires libres côté livreur.",
      },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

/** Tri du plus récent au plus ancien -- utilisé par l'index /blog. */
export function getSortedBlogPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}
