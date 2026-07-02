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

  return NextResponse.json({ pro });
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

  const pro = await prisma.pro.update({
    where: { id: existing.id },
    data: parsed.data,
  });

  return NextResponse.json({ pro });
}

export const GET = withErrorHandling(getHandler);
export const PATCH = withErrorHandling(patchHandler);
