import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/cron/reset-product-availability
 *
 * Déclenché une fois par jour par Vercel Cron (voir vercel.json — "crons").
 * Remet automatiquement disponible tout produit rendu indisponible "pour
 * aujourd'hui seulement" depuis la fiche produit côté Pro
 * (ProductFormModal.tsx, champ Product.unavailableUntil) une fois la date
 * d'indisponibilité dépassée. Un produit rendu indisponible "jusqu'à nouvel
 * ordre" (unavailableUntil = null) n'est jamais touché ici -- seul le Pro
 * peut le réactiver manuellement.
 *
 * Protégé par CRON_SECRET (variable d'env Vercel), même garde-fou que
 * /api/cron/capacity-sweep : Vercel Cron ajoute automatiquement
 * `Authorization: Bearer <CRON_SECRET>` à ses appels. Tant que CRON_SECRET
 * n'est pas configuré côté Vercel, cette route refuse tout appel plutôt que
 * de tourner sans protection.
 */
async function getHandler(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET non configuré." }, { status: 503 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { count } = await prisma.product.updateMany({
    where: {
      isAvailable: false,
      unavailableUntil: { not: null, lte: new Date() },
    },
    data: { isAvailable: true, unavailableUntil: null },
  });

  return NextResponse.json({ ok: true, reactivatedProducts: count });
}

export const GET = withErrorHandling(getHandler);
