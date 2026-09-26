import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole, ProCategory } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

// Mêmes règles que POST /api/admin/prospects (ajout manuel) -- voir ce
// fichier pour le détail du `.or(z.literal(""))`. Ici en plus : chaque ligne
// est individuellement tolérante (une ligne invalide est ignorée avec un
// message, pas tout l'import qui échoue).
const importRowSchema = z.object({
  businessName: z.string().trim().min(1, "nom manquant"),
  city: z.string().trim().min(1, "ville manquante"),
  category: z.nativeEnum(ProCategory).optional(),
  email: z.string().trim().email().or(z.literal("")).optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  websiteUrl: z.string().trim().url().or(z.literal("")).optional().nullable(),
  googleMapsUrl: z.string().trim().url().or(z.literal("")).optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

const importBodySchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).min(1, "aucune ligne à importer"),
});

/**
 * POST /api/admin/prospects/import
 *
 * Import CSV depuis la page Prospection (ajout du 26/09/2026, demande de
 * Krys) -- le parsing du fichier CSV se fait côté Admin (voir
 * ProspectionPage.tsx, symétrique avec handleExportCsv), ce endpoint reçoit
 * déjà des lignes structurées en JSON. Dédoublonne sur (nom, ville) en
 * minuscules, même logique que /api/admin/prospects/seed -- une ligne dont
 * le (nom, ville) existe déjà est ignorée (skipped), pas mise à jour :
 * utiliser l'édition manuelle depuis le tableau pour corriger une ligne
 * existante.
 */
async function postHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  const parsedBody = importBodySchema.safeParse(body);
  if (!parsedBody.success) {
    throw new ApiError(400, parsedBody.error.issues.map((i) => i.message).join(" "));
  }

  const existing = await prisma.prospect.findMany({ select: { businessName: true, city: true } });
  const existingKeys = new Set(existing.map((p) => `${p.businessName.toLowerCase()}::${p.city.toLowerCase()}`));

  const toCreate: {
    businessName: string;
    city: string;
    category: ProCategory;
    email: string | null;
    phone: string | null;
    websiteUrl: string | null;
    googleMapsUrl: string | null;
    notes: string | null;
    source: string;
  }[] = [];
  const errors: { row: number; message: string }[] = [];
  let skipped = 0;

  parsedBody.data.rows.forEach((raw, i) => {
    const parsed = importRowSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push({ row: i + 1, message: parsed.error.issues.map((iss) => iss.message).join(" ") });
      return;
    }
    const key = `${parsed.data.businessName.toLowerCase()}::${parsed.data.city.toLowerCase()}`;
    if (existingKeys.has(key)) {
      skipped += 1;
      return;
    }
    existingKeys.add(key); // évite aussi les doublons internes au CSV lui-même
    toCreate.push({
      businessName: parsed.data.businessName,
      city: parsed.data.city,
      category: parsed.data.category ?? ProCategory.AUTRE,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      websiteUrl: parsed.data.websiteUrl || null,
      googleMapsUrl: parsed.data.googleMapsUrl || null,
      notes: parsed.data.notes || null,
      source: "csv",
    });
  });

  if (toCreate.length > 0) {
    await prisma.prospect.createMany({ data: toCreate });
  }

  return NextResponse.json({ imported: toCreate.length, skipped, errors });
}

export const POST = withErrorHandling(postHandler);
