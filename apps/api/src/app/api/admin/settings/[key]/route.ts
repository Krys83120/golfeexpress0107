import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

const updateSettingSchema = z.object({
  value: z.any(),
});

/**
 * GET /api/admin/settings/[key]
 *
 * Manquait jusqu'ici (seulement PATCH/PUT existaient) — nécessaire pour
 * que la page Branding puisse relire le logo actuellement configuré au
 * chargement, sans avoir à tout lister via GET /api/admin/settings.
 */
async function getHandler(req: NextRequest, ctx: { params: { key: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const setting = await prisma.globalSetting.findUnique({ where: { key: ctx.params.key } });
  if (!setting) {
    throw new ApiError(404, "Paramètre introuvable.");
  }

  return NextResponse.json({ setting });
}

export const GET = withErrorHandling(getHandler);

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

/**
 * PUT /api/admin/settings/[key]
 * Body: { value, description? }
 *
 * Upsert — pratique pour les pages Admin (Branding, SEO/GEO...) qui
 * n'ont pas besoin de savoir si le paramètre existe déjà avant d'écrire
 * dessus, contrairement à POST (crée, échoue si existe) / PATCH (modifie,
 * échoue si absent).
 */
async function putHandler(req: NextRequest, ctx: { params: { key: string } }) {
  const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  const parsed = updateSettingSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, "Champ 'value' requis.");
  }

  const setting = await prisma.globalSetting.upsert({
    where: { key: ctx.params.key },
    update: { value: parsed.data.value, updatedBy: auth.userId },
    create: { key: ctx.params.key, value: parsed.data.value, updatedBy: auth.userId },
  });

  return NextResponse.json({ setting });
}

export const PUT = withErrorHandling(putHandler);
