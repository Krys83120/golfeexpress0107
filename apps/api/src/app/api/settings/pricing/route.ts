import { NextResponse } from "next/server";
import { getDeliveryFee } from "@/lib/pricingSettings";

// Voir apps/api/src/app/api/settings/branding/route.ts pour le détail du
// raisonnement (identique ici) : sans "force-dynamic", Next.js fige cette
// réponse au moment du build.
export const dynamic = "force-dynamic";

/**
 * GET /api/settings/pricing
 *
 * Route PUBLIQUE (aucune auth) — expose les tarifs affichés aux clients
 * AVANT toute commande (ex: "Livraison X€" sur chaque fiche commerçant,
 * voir apps/client/src/components/ProCard.tsx).
 *
 * Corrige un bug (21/08/2026) : apps/client/src/services/prosApi.ts
 * affichait un montant CODÉ EN DUR (2,90 €, l'ancien tarif par défaut) sur
 * chaque fiche commerçant. Le 21/08/2026, le tarif réellement facturé aux
 * commandes (voir pricingSettings.ts -> getDeliveryFee(), utilisé par
 * POST /api/orders) a été relevé à 3,90 € par défaut — mais rien ne
 * synchronisait cet affichage codé en dur avec le vrai tarif configuré
 * depuis Admin > Tarification. Résultat : l'app continuait de montrer
 * l'ancien montant aux clients (2,90 €) alors que la commande réelle
 * facturait le tarif à jour (ou l'ancien, si jamais mis à jour en base —
 * dans les deux cas, l'affichage divergeait silencieusement du vrai
 * réglage). Le Client utilise maintenant cette route pour afficher le
 * VRAI tarif en vigueur, quel qu'il soit.
 *
 * Reprend le même principe que /api/settings/branding : liste blanche
 * minimaliste plutôt que d'ouvrir /api/admin/settings (qui exige un rôle
 * Admin et renvoie TOUS les GlobalSetting, y compris des clés orphelines
 * sans rapport avec le calcul réel des prix — ex: "commission_rate",
 * "min_delivery_fee"/"max_delivery_fee" à la racine, jamais lues par
 * POST /api/orders, contrairement à "pricing.delivery_fee").
 */
export async function GET() {
  const deliveryFee = await getDeliveryFee();

  return NextResponse.json(
    { deliveryFee },
    // Cache court — le tarif ne change pas souvent, mais une mise à jour
    // depuis Admin > Tarification doit se propager sans attendre trop
    // longtemps côté clients qui parcourent déjà l'app.
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } }
  );
}
