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
  notes: z.string().trim().optional().nullable(),
  offersTakeaway: z.boolean().optional().nullable(),
  advertisesUberEats: z.boolean().optional().nullable(),
});

/**
 * PATCH /api/admin/prospects/[prospectId]
 *
 * Édition d'une ligne -- Krys s'en sert surtout pour compléter un email
 * laissé vide par la recherche web initiale, ou corriger une coquille.
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
  for (const key of ["email", "phone", "websiteUrl", "googleMapsUrl", "notes"] as const) {
    if (data[key] === "") data[key] = null;
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
