import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { updateOpeningHoursSchema } from "@/lib/validation/proProfile";

/**
 * GET /api/pros/me/opening-hours
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);
  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }
  const openingHours = await prisma.openingHours.findMany({
    where: { proId: pro.id },
    orderBy: { dayOfWeek: "asc" },
  });
  return NextResponse.json({ openingHours });
}

/**
 * PUT /api/pros/me/opening-hours
 * Body: { hours: [{ dayOfWeek, openTime, closeTime, isClosed }, ...] }
 *
 * Un jour peut désormais avoir PLUSIEURS lignes (plusieurs créneaux dans la
 * même journée, ex: 10h-14h puis 18h-23h pour un Pro en coupure) — `hours`
 * n'est donc plus limité à exactement 7 entrées, seulement à au moins une
 * par jour (voir updateOpeningHoursSchema qui vérifie la couverture des 7
 * jours et l'absence de chevauchement entre créneaux d'un même jour).
 *
 * Remplace systématiquement toutes les lignes existantes (delete + recreate
 * dans une transaction) plutôt que de gérer un diff — plus simple et sans
 * risque d'incohérence puisque l'app envoie toujours l'état complet.
 */
async function putHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);
  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }
  const body = await req.json().catch(() => null);
  const parsed = updateOpeningHoursSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }
  const openingHours = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.openingHours.deleteMany({ where: { proId: pro.id } });
    await tx.openingHours.createMany({
      data: parsed.data.hours.map((h) => ({ ...h, proId: pro.id })),
    });
    return tx.openingHours.findMany({ where: { proId: pro.id }, orderBy: { dayOfWeek: "asc" } });
  });
  return NextResponse.json({ openingHours });
}

export const GET = withErrorHandling(getHandler);
export const PUT = withErrorHandling(putHandler);
