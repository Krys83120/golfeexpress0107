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
 */
async function getHandler(_req: NextRequest) {
  const packs = await getPublicPacks();
  return NextResponse.json({ packs });
}

export const GET = withErrorHandling(getHandler);
