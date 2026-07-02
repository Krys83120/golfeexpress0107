import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/settings
 *
 * Liste tous les GlobalSetting. Lecture réservée aux admins ici ; les
 * valeurs nécessaires au calcul des prix côté apps publiques (ex:
 * min_delivery_fee) devraient être exposées séparément via une route
 * publique dédiée et minimaliste plutôt que d'ouvrir tout ce endpoint —
 * TODO: GET /api/settings/public qui ne renvoie qu'une liste blanche de clés.
 */
async function getHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const settings = await prisma.globalSetting.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json({ settings });
}

const createSettingSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
  description: z.string().optional(),
});

/**
 * POST /api/admin/settings
 * Body: { key, value, description? }
 */
async function postHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  const parsed = createSettingSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, "Champs 'key' et 'value' requis.");
  }

  const existing = await prisma.globalSetting.findUnique({ where: { key: parsed.data.key } });
  if (existing) {
    throw new ApiError(409, "Ce paramètre existe déjà — utilisez PATCH pour le modifier.");
  }

  const setting = await prisma.globalSetting.create({
    data: {
      key: parsed.data.key,
      value: parsed.data.value,
      description: parsed.data.description,
      updatedBy: auth.userId,
    },
  });

  return NextResponse.json({ setting }, { status: 201 });
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
