import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/middleware/auth";
import { getPublicPacks } from "@/lib/partnerPacks";

/**
 * GET /api/partner-packs (public, pas d'auth requise)
 *
 * Liste les packs partenaires actifs (nom, prix, avantages, commission) —
 * alimente à la fois la section "Devenir partenaire" du site vitrine
 * (apps/www) et l'écran de souscription côté Pro (apps/pro). Ne renvoie
 * jamais les identifiants Stripe internes (voir toPublicPack dans
 * lib/partnerPacks.ts) : ceux-ci ne sortent que via les routes admin.
 *
 * `export const dynamic = "force-dynamic"` est OBLIGATOIRE ici (bug corrigé
 * le 19/09/2026) : ce handler ne lit ni header, ni searchParams, ni cookie —
 * rien qui force Next.js à traiter la route comme dynamique. Sans cette
 * ligne, Next.js la rend STATIQUEMENT au build et sert ensuite indéfiniment
 * la même réponse figée à ce moment-là, quel que soit le nombre
 * d'enregistrements ultérieurs dans Admin > Packs Partenaires — Admin
 * lui-même n'est pas affecté (sa route passe par requireAuth qui lit les
 * headers, ce qui la rend dynamique automatiquement), ce qui donnait
 * l'illusion trompeuse que "Enregistré." avait fonctionné alors que le site
 * public et apps/pro continuaient d'afficher les anciens taux. Diagnostiqué
 * en confirmant que GET /api/partner-packs renvoyait toujours les mêmes
 * valeurs après plusieurs sauvegardes admin réussies.
 */
export const dynamic = "force-dynamic";

async function getHandler(_req: NextRequest) {
  const packs = await getPublicPacks();
  return NextResponse.json({ packs });
}

export const GET = withErrorHandling(getHandler);
