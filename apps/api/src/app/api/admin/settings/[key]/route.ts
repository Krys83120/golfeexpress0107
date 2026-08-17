import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
 
/**
 * GET/PUT /api/admin/settings/:key
 *
 * Route manquante jusqu'ici : le client Admin (brandingApi.ts â€” logo,
 * texte og:title/og:description du site vitrine, et maintenant photo de
 * fond des images de partage) appelle dÃ©jÃ  PUT /api/admin/settings/:key
 * pour enregistrer un rÃ©glage individuel, et GET pour le relire â€” mais
 * seule la route collection (GET liste tout, POST crÃ©e si absent, Ã©choue
 * sinon) existait sous /api/admin/settings. Sans ce fichier, tout appel Ã 
 * une clÃ© prÃ©cise (ex. "branding.www_logo_url") retombait sur le 404 Next.js
 * par dÃ©faut : l'upload du logo semblait fonctionner (l'upload Storage
 * rÃ©ussit) mais la sauvegarde de sa rÃ©fÃ©rence Ã©chouait silencieusement
 * juste aprÃ¨s, et Ã  la prochaine visite le logo redevenait "jamais
 * configurÃ©". Cette route corrige Ã§a avec un upsert (crÃ©e si absent, met Ã 
 * jour sinon) au lieu du POST create-only existant.
 */
 
async function getHandler(req: NextRequest, { params }: { params: { key: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
 
  const setting = await prisma.globalSetting.findUnique({ where: { key: params.key } });
  return NextResponse.json({ setting: setting ?? null });
}
 
const putSettingSchema = z.object({
  value: z.any(),
  description: z.string().optional(),
});
 
async function putHandler(req: NextRequest, { params }: { params: { key: string } }) {
  const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
 
  const body = await req.json().catch(() => null);
  const parsed = putSettingSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, "Champ 'value' requis.");
  }
 
  const setting = await prisma.globalSetting.upsert({
    where: { key: params.key },
    create: {
      key: params.key,
      value: parsed.data.value,
      description: parsed.data.description,
      updatedBy: auth.userId,
    },
    update: {
      value: parsed.data.value,
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      updatedBy: auth.userId,
    },
  });
 
  return NextResponse.json({ setting });
}
 
export const GET = withErrorHandling(getHandler);
export const PUT = withErrorHandling(putHandler);