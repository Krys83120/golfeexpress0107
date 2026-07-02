import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

const updateSettingSchema = z.object({
  value: z.any(),
});

/**
 * PATCH /api/admin/settings/[key]
 * Body: { value }
 *
 * `key` est l'identifiant métier (ex: "commission_rate"), pas un id UUID —
 * cohérent avec le fait que GlobalSetting.key est @unique dans le schéma.
 */
async function patchHandler(req: NextRequest, ctx: { params: { key: string } }) {
  const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  const parsed = updateSettingSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, "Champ 'value' requis.");
  }

  const existing = await prisma.globalSetting.findUnique({ where: { key: ctx.params.key } });
  if (!existing) {
    throw new ApiError(404, "Paramètre introuvable.");
  }

  const setting = await prisma.globalSetting.update({
    where: { key: ctx.params.key },
    data: { value: parsed.data.value, updatedBy: auth.userId },
  });

  return NextResponse.json({ setting });
}

export const PATCH = withErrorHandling(patchHandler);
