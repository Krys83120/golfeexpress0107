import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/service-cities
 *
 * Liste toutes les villes/communes connues du système d'activation
 * progressive (voir ServiceCity côté Prisma), triées pour un affichage
 * admin stable : actives d'abord (sortOrder), puis le reste par nom.
 */
async function getHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const cities = await prisma.serviceCity.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ cities });
}

const createCitySchema = z.object({
  name: z.string().trim().min(1, "Le nom de la ville est requis."),
  isActive: z.boolean().optional(),
});

/**
 * POST /api/admin/service-cities
 * Body: { name, isActive? }
 *
 * Créée par défaut INACTIVE (isActive=false) sauf si explicitement précisé
 * — ajouter "Cogolin" à la liste ne l'ouvre pas tout de suite, il faut
 * ensuite l'activer volontairement (voir PATCH ci-dessous).
 */
async function postHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  const parsed = createCitySchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const existing = await prisma.serviceCity.findFirst({
    where: { name: { equals: parsed.data.name, mode: "insensitive" } },
  });
  if (existing) {
    throw new ApiError(409, "Cette ville existe déjà dans la liste.");
  }

  const maxSortOrder = await prisma.serviceCity.aggregate({ _max: { sortOrder: true } });

  const city = await prisma.serviceCity.create({
    data: {
      name: parsed.data.name,
      isActive: parsed.data.isActive ?? false,
      sortOrder: (maxSortOrder._max.sortOrder ?? 0) + 1,
    },
  });

  return NextResponse.json({ city }, { status: 201 });
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
