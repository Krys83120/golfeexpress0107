import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

const updateCitySchema = z.object({
  name: z.string().trim().min(1).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

/**
 * PATCH /api/admin/service-cities/[cityId]
 * Body: { name?, isActive?, sortOrder? }
 *
 * C'est CE endpoint (bouton "Activer" côté Admin > Zones & Capacité) qui
 * ouvre réellement une ville au public une fois que
 * capacity.city_gating_enabled est également activé (voir
 * lib/capacitySettings.ts et orders/route.ts) — les deux réglages sont
 * indépendants pour permettre de préparer la liste de villes à l'avance
 * sans rien changer au comportement live.
 */
async function patchHandler(req: NextRequest, ctx: { params: { cityId: string } }) {
  const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  const parsed = updateCitySchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const existing = await prisma.serviceCity.findUnique({ where: { id: ctx.params.cityId } });
  if (!existing) {
    throw new ApiError(404, "Ville introuvable.");
  }

  const city = await prisma.serviceCity.update({
    where: { id: ctx.params.cityId },
    data: parsed.data,
  });

  return NextResponse.json({ city, updatedBy: auth.userId });
}

/** DELETE /api/admin/service-cities/[cityId] */
async function deleteHandler(req: NextRequest, ctx: { params: { cityId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const existing = await prisma.serviceCity.findUnique({ where: { id: ctx.params.cityId } });
  if (!existing) {
    throw new ApiError(404, "Ville introuvable.");
  }

  await prisma.serviceCity.delete({ where: { id: ctx.params.cityId } });
  return NextResponse.json({ ok: true });
}

export const PATCH = withErrorHandling(patchHandler);
export const DELETE = withErrorHandling(deleteHandler);
