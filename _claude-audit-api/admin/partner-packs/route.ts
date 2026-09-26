import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { getAdminPacks, saveAdminPacks, ensureStripePrice } from "@/lib/partnerPacks";
import { updatePartnerPackSchema } from "@/lib/validation/partnerPacks";

/**
 * GET /api/admin/partner-packs
 *
 * Vue admin des 3 packs partenaires, avec les identifiants Stripe internes
 * (stripeProductId/stripePriceId) — jamais exposés sur la route publique
 * GET /api/partner-packs.
 */
async function getHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const packs = await getAdminPacks();
  return NextResponse.json({ packs });
}

/**
 * PATCH /api/admin/partner-packs
 * Body: { tier: "FREE"|"PREMIUM"|"PREMIUM_PLUS", name?, priceMonthly?, commissionRate?, features?, isActive? }
 *
 * Met à jour UN pack (identifié par `tier`) et enregistre les 3 packs au
 * complet. Si `priceMonthly` change pour un pack payant, crée automatiquement
 * un nouveau Prix Stripe et archive l'ancien (voir ensureStripePrice) — le
 * pack FREE n'a jamais de Prix Stripe (gratuit).
 */
async function patchHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  const parsed = updatePartnerPackSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.data ? "Champs invalides." : parsed.error.issues.map((i) => i.message).join(" "));
  }

  const packs = await getAdminPacks();
  const index = packs.findIndex((p) => p.tier === parsed.data.tier);
  if (index === -1) {
    throw new ApiError(404, "Pack introuvable.");
  }

  const current = packs[index];
  const priceChanged =
    parsed.data.priceMonthly !== undefined && parsed.data.priceMonthly !== current.priceMonthly;

  let updated = {
    ...current,
    ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
    ...(parsed.data.priceMonthly !== undefined ? { priceMonthly: parsed.data.priceMonthly } : {}),
    ...(parsed.data.commissionRate !== undefined ? { commissionRate: parsed.data.commissionRate } : {}),
    ...(parsed.data.features !== undefined ? { features: parsed.data.features } : {}),
    ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
  };

  // Un changement de prix (ou un pack payant qui n'a encore jamais eu de
  // Prix Stripe, ex: tout premier enregistrement) déclenche la création
  // Stripe — sinon on garde le stripePriceId existant tel quel pour éviter
  // un appel Stripe inutile à chaque simple modif de texte/avantages.
  if (priceChanged || (updated.priceMonthly > 0 && !updated.stripePriceId)) {
    updated = await ensureStripePrice(updated);
  }

  const nextPacks = [...packs];
  nextPacks[index] = updated;

  await saveAdminPacks(nextPacks, auth.userId);

  return NextResponse.json({ pack: updated, packs: nextPacks });
}

export const GET = withErrorHandling(getHandler);
export const PATCH = withErrorHandling(patchHandler);
