/**
 * Contenu partagé entre /devenir-partenaire (page combinée commerçants +
 * livreurs) et /devenir-livreur (page dédiée, créée le 23/08/2026 pour que
 * "devenir livreur [ville]" ait sa propre URL/H1/meta plutôt que de
 * dépendre d'une ancre #livreurs — voir mission SEO/GEO, maillage interne).
 * Centralisé ici plutôt que dupliqué dans les deux pages (voir "NE DUPLIQUE
 * PAS ce qui existe déjà").
 */

export interface Step {
  title: string;
  description: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export const TIER_ORDER = ["FREE", "PREMIUM", "PREMIUM_PLUS"];

export const PRO_STEPS: Step[] = [
  { title: "Créez votre compte Pro", description: "Renseignez le nom de votre commerce, votre catégorie et vos coordonnées." },
  { title: "Fournissez vos informations légales", description: "Numéro SIRET et extrait Kbis à jour (moins de 3 mois) — nécessaires pour activer votre compte." },
  { title: "Validation par notre équipe", description: "Vos informations sont vérifiées manuellement, généralement sous 24 à 48h." },
  { title: "Mettez en ligne votre catalogue", description: "Ajoutez vos produits, photos, options et horaires — vous gardez la main sur tout." },
  { title: "Recevez vos premières commandes", description: "Chaque commande arrive en temps réel, un livreur du réseau vient la récupérer." },
];

export const PRO_FAQ: FaqItem[] = [
  { q: "L'inscription est-elle payante ?", a: "Non, l'inscription est gratuite et le pack Free est disponible sans engagement. Vous pouvez souscrire à un pack payant à tout moment si vous souhaitez réduire votre commission." },
  { q: "Ai-je besoin d'un SIRET pour vendre ?", a: "Oui, la vente de produits doit être déclarée. Un numéro SIRET valide et un extrait Kbis à jour sont nécessaires pour activer votre compte." },
  { q: "Puis-je changer de pack ou résilier ?", a: "Oui, à tout moment, directement depuis votre espace Pro, sans engagement de durée." },
  { q: "Comment suis-je payé ?", a: "Les sommes dues sont reversées via Stripe Connect, déduction faite de la commission de votre pack. Vos factures restent consultables à tout moment." },
];

export const RIDER_STEPS: Step[] = [
  { title: "Créez votre compte Livreur", description: "Quelques informations de base pour démarrer votre inscription." },
  { title: "Complétez votre dossier", description: "Pièce d'identité, selfie de vérification, photo de profil (obligatoire, visible par vos clients), véhicule, assurance, statut professionnel et IBAN." },
  { title: "Validation sous 24 à 48h", description: "Notre équipe vérifie votre dossier manuellement et vous informe du résultat." },
  { title: "Passez en ligne et livrez", description: "Aucun horaire imposé — vous choisissez quand et où vous êtes disponible." },
];

export const RIDER_REQUIREMENTS: string[] = [
  "Être majeur et disposer d'un moyen de transport en règle (scooter, vélo, voiture...)",
  "Fournir une pièce d'identité valide",
  "Fournir une attestation d'assurance responsabilité civile professionnelle",
  "Avoir un statut d'indépendant (auto-entrepreneur ou équivalent)",
  "Fournir une photo de profil — obligatoire, c'est elle qui sera visible par vos clients",
];

export const RIDER_FAQ: FaqItem[] = [
  { q: "Dois-je avoir un statut d'auto-entrepreneur ?", a: "Oui, vous exercez en toute indépendance : auto-entrepreneur, société ou tout autre statut autorisé. Do You Geckoo n'est pas votre employeur." },
  { q: "Puis-je choisir mes horaires ?", a: "Oui, entièrement. Vous passez en ligne quand vous le souhaitez, sur les zones que vous choisissez, et pouvez refuser une course sans justification." },
  { q: "Pourquoi la photo de profil est-elle obligatoire ?", a: "C'est elle qui rassure le client pendant sa livraison — comme sur les plateformes comparables, il doit pouvoir identifier son livreur. Votre dossier ne peut pas être validé sans elle." },
  { q: "Comment suis-je payé ?", a: "Chaque course affiche son montant avant acceptation. Vos gains sont visibles en temps réel et peuvent être retirés vers votre compte bancaire via Stripe Connect." },
];
