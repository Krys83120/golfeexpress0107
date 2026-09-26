import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole, ProCategory } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/prospects
 *
 * Liste tous les prospects de la page Admin > Prospection (ajout du
 * 26/09/2026, demande de Krys). Le filtrage (ville, catégorie, statut,
 * recherche) et le tri se font côté front -- la liste reste de taille
 * modeste (quelques centaines de lignes au plus), pas besoin de pagination
 * serveur pour l'instant.
 */
async function getHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const prospects = await prisma.prospect.findMany({
    orderBy: [{ city: "asc" }, { businessName: "asc" }],
  });
  return NextResponse.json({ prospects });
}

// `.or(z.literal(""))` sur les champs optionnels : le formulaire Admin
// envoie une chaîne vide (jamais `undefined`) quand Krys laisse un champ
// non renseigné -- sans ce fallback, `.email()`/`.url()` rejetteraient "" et
// bloqueraient l'ajout d'un prospect sans email/site connu.
const createProspectSchema = z.object({
  businessName: z.string().trim().min(1, "Le nom du commerce est requis."),
  city: z.string().trim().min(1, "La ville est requise."),
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
 * POST /api/admin/prospects
 *
 * Ajout manuel d'un prospect depuis Admin (source="manuel") -- pour les
 * commerces que Krys connaît déjà et veut démarcher, en plus de la liste de
 * recherche importée via /api/admin/prospects/seed.
 */
async function postHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  const parsed = createProspectSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const prospect = await prisma.prospect.create({
    data: {
      businessName: parsed.data.businessName,
      city: parsed.data.city,
      category: parsed.data.category ?? ProCategory.AUTRE,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      websiteUrl: parsed.data.websiteUrl || null,
      googleMapsUrl: parsed.data.googleMapsUrl || null,
      notes: parsed.data.notes || null,
      offersTakeaway: parsed.data.offersTakeaway ?? null,
      advertisesUberEats: parsed.data.advertisesUberEats ?? null,
      source: "manuel",
    },
  });

  return NextResponse.json({ prospect }, { status: 201 });
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
