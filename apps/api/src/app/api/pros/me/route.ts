import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { updateProProfileSchema } from "@/lib/validation/proProfile";

/**
 * GET /api/pros/me
 * Profil complet de la boutique du Pro connecté (infos + adresses + horaires).
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const pro = await prisma.pro.findUnique({
    where: { userId: auth.userId },
    include: { addresses: true, openingHours: true },
  });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }

  return NextResponse.json({
    pro: {
      ...pro,
      commissionRate: Number(pro.commissionRate),
      rating: pro.rating !== null ? Number(pro.rating) : null,
      googleRating: pro.googleRating !== null ? Number(pro.googleRating) : null,
    },
  });
}

/**
 * PATCH /api/pros/me
 * Body: champs partiels (businessName, description, phone, emailContact, logo, coverImage)
 *
 * Volontairement, SIRET et category ne sont pas modifiables ici — ce sont
 * des informations légales/structurelles qui devraient passer par une
 * vérification admin plutôt qu'une simple édition libre.
 */
async function patchHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const existing = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (!existing) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }

  const body = await req.json().catch(() => null);
  const parsed = updateProProfileSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const data: Record<string, unknown> = { ...parsed.data };

  // Si le SIRET change, on invalide la vérification précédente — un
  // nouveau SIRET doit être revérifié avant d'être considéré comme validé.
  if (parsed.data.siret && parsed.data.siret !== existing.siret) {
    data.siretVerified = false;
    data.siretVerifiedAt = null;
  }

  // Horodatage serveur (jamais confié au client) dès qu'un nouveau Kbis est
  // fourni — sert à calculer côté UI si le document a plus de 3 mois.
  if (parsed.data.kbisUrl && parsed.data.kbisUrl !== existing.kbisUrl) {
    data.kbisUploadedAt = new Date();
  }

  // Horodatage de l'acceptation CGU/CGV côté serveur (jamais confié au
  // client) — voir la même logique côté /api/riders/me.
  if (parsed.data.acceptTerms) {
    delete data.acceptTerms;
    data.termsAcceptedAt = new Date();
    data.termsVersion = parsed.data.termsVersion ?? "1.0";
    data.termsAcceptedIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? null;
  } else {
    delete data.acceptTerms;
  }

  const pro = await prisma.pro.update({
    where: { id: existing.id },
    data,
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

export const GET = withErrorHandling(getHandler);
export const PATCH = withErrorHandling(patchHandler);
