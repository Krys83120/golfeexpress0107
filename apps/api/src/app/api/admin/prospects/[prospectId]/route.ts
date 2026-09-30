import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole, ProCategory } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

// `.or(z.literal(""))` : le formulaire Admin envoie "" (jamais `undefined`)
// pour effacer un champ -- voir la conversion ""->null juste après le parse
// ci-dessous. Sans ce fallback, `.email()`/`.url()` rejetteraient "" et
// empêcheraient Krys de vider un champ déjà rempli.
const updateProspectSchema = z.object({
  businessName: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).optional(),
  category: z.nativeEnum(ProCategory).optional(),
  email: z.string().trim().email("Email invalide.").or(z.literal("")).optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  websiteUrl: z.string().trim().url("URL invalide.").or(z.literal("")).optional().nullable(),
  googleMapsUrl: z.string().trim().url("URL invalide.").or(z.literal("")).optional().nullable(),
  facebookUrl: z.string().trim().url("URL invalide.").or(z.literal("")).optional().nullable(),
  logoUrl: z.string().trim().url("URL invalide.").or(z.literal("")).optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  offersTakeaway: z.boolean().optional().nullable(),
  advertisesUberEats: z.boolean().optional().nullable(),
  showOnDirectory: z.boolean().optional(),
  /**
   * Marque manuellement ce prospect comme converti (true) ou annule ce
   * marquage par erreur (false) -- ajout du 30/09/2026. convertedAt se
   * remplit normalement tout seul au signup d'un Pro avec le même email
   * (voir app/api/auth/signup/route.ts), mais ça suppose que ce prospect a
   * bien un email ET que le Pro s'est inscrit avec exactement cet email :
   * un partenaire déjà inscrit avant l'ajout de la Prospection, ou inscrit
   * avec une autre adresse, reste donc "pas encore partenaire" pour
   * toujours sans ce rattrapage manuel -- exactement le cas de Times food
   * qui a fait remonter le problème. Champ virtuel : jamais stocké tel
   * quel, traduit en convertedAt ci-dessous.
   */
  markConverted: z.boolean().optional(),
});

/**
 * PATCH /api/admin/prospects/[prospectId]
 *
 * Édition d'une ligne -- Krys s'en sert surtout pour compléter un email
 * laissé vide par la recherche web initiale, corriger une coquille, ou
 * (30/09/2026) coller le logo affiché sur /decouvrir/[ville] et
 * activer/désactiver l'apparition sur cette page annuaire.
 */
async function patchHandler(req: NextRequest, ctx: { params: { prospectId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  const parsed = updateProspectSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const existing = await prisma.prospect.findUnique({ where: { id: ctx.params.prospectId } });
  if (!existing) {
    throw new ApiError(404, "Prospect introuvable.");
  }

  const data: Record<string, unknown> = { ...parsed.data };
  // Une chaîne vide envoyée depuis un champ optionnel du formulaire Admin
  // doit effacer la valeur (null), pas rester une chaîne vide en base.
  for (const key of ["email", "phone", "websiteUrl", "googleMapsUrl", "facebookUrl", "logoUrl", "notes"] as const) {
    if (data[key] === "") data[key] = null;
  }

  // markConverted n'est pas une vraie colonne -- traduit en convertedAt
  // juste avant l'update (voir le commentaire sur le schéma ci-dessus).
  if ("markConverted" in data) {
    data.convertedAt = data.markConverted ? new Date() : null;
    delete data.markConverted;
  }

  const prospect = await prisma.prospect.update({ where: { id: existing.id }, data });
  return NextResponse.json({ prospect });
}

/**
 * DELETE /api/admin/prospects/[prospectId]
 *
 * Retrait d'une ligne -- ex. doublon, commerce fermé, ou un des faux
 * positifs signalés par la recherche web initiale (nom+ville sans autre
 * info fiable).
 */
async function deleteHandler(req: NextRequest, ctx: { params: { prospectId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const existing = await prisma.prospect.findUnique({ where: { id: ctx.params.prospectId } });
  if (!existing) {
    throw new ApiError(404, "Prospect introuvable.");
  }

  await prisma.prospect.delete({ where: { id: existing.id } });
  return NextResponse.json({ deleted: true });
}

export const PATCH = withErrorHandling(patchHandler);
export const DELETE = withErrorHandling(deleteHandler);
