import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { updateClosureSchema } from "@/lib/validation/proProfile";

/**
 * PATCH /api/pros/me/closure
 *
 * Bascule "En vacances" / "Fermé exceptionnellement" en un clic, SANS
 * toucher aux horaires hebdomadaires (OpeningHours, voir
 * /api/pros/me/opening-hours) — ceux-ci restent enregistrés tels quels en
 * base et se réappliquent automatiquement dès que isManuallyClosed repasse
 * à false. Voir aussi lib/openingHours.ts (computeOpenStatus), qui donne
 * toujours priorité à cette fermeture manuelle sur les horaires dans le
 * calcul ouvert/fermé exposé aux clients.
 *
 * Body: {
 *   isManuallyClosed: boolean,
 *   manualClosureReason?: "VACATION" | "CLOSED" | null,
 *   manualClosureUntil?: "YYYY-MM-DD" | null,
 *   manualClosureNote?: string | null
 * }
 */
async function patchHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const existing = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (!existing) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }

  const body = await req.json().catch(() => null);
  const parsed = updateClosureSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const { isManuallyClosed, manualClosureReason, manualClosureUntil, manualClosureNote } = parsed.data;

  if (isManuallyClosed && !manualClosureReason) {
    throw new ApiError(400, "Précisez le motif de fermeture (vacances ou fermeture exceptionnelle).");
  }

  // On efface systématiquement le motif/date/note quand la boutique
  // rouvre — évite qu'une vieille date de retour "traîne" en base et
  // réapparaisse par erreur lors d'une prochaine fermeture.
  const pro = await prisma.pro.update({
    where: { id: existing.id },
    data: {
      isManuallyClosed,
      manualClosureReason: isManuallyClosed ? manualClosureReason : null,
      manualClosureUntil: isManuallyClosed && manualClosureUntil ? new Date(`${manualClosureUntil}T00:00:00Z`) : null,
      manualClosureNote: isManuallyClosed ? (manualClosureNote ?? null) : null,
    },
  });

  return NextResponse.json({
    pro: {
      ...pro,
      commissionRate: Number(pro.commissionRate),
      rating: pro.rating !== null ? Number(pro.rating) : null,
      googleRating: pro.googleRating !== null ? Number(pro.googleRating) : null,
    },
  });
}

export const PATCH = withErrorHandling(patchHandler);
