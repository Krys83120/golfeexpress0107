import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { PROSPECT_SEED_DATA } from "@/lib/prospectSeedData";

/**
 * POST /api/admin/prospects/seed
 *
 * Importe la liste de départ constituée par recherche web (voir
 * lib/prospectSeedData.ts pour la méthodologie et les limites) --
 * déclenché par Krys elle-même via le bouton "Charger la liste de départ"
 * sur la page Prospection quand la liste est vide (ajout du 26/09/2026).
 *
 * Idempotent : dédoublonne sur (businessName, city) pour pouvoir être
 * rappelé sans risque (ex. après un ajout manuel qui recoupe une ligne de
 * la liste de recherche) -- ne crée jamais de doublon, ne touche jamais une
 * ligne déjà là (pour ne pas écraser une correction manuelle de Krys).
 */
async function postHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const existing = await prisma.prospect.findMany({ select: { businessName: true, city: true } });
  const existingKeys = new Set(existing.map((p) => `${p.businessName.toLowerCase()}|${p.city.toLowerCase()}`));

  const toCreate = PROSPECT_SEED_DATA.filter(
    (entry) => !existingKeys.has(`${entry.businessName.toLowerCase()}|${entry.city.toLowerCase()}`)
  );

  if (toCreate.length > 0) {
    await prisma.prospect.createMany({
      data: toCreate.map((entry) => ({
        businessName: entry.businessName,
        city: entry.city,
        category: entry.category,
        email: entry.email,
        phone: entry.phone,
        websiteUrl: entry.websiteUrl,
        googleMapsUrl: entry.googleMapsUrl,
        notes: entry.notes ?? null,
        source: "recherche_web",
      })),
    });
  }

  return NextResponse.json({ imported: toCreate.length, skipped: PROSPECT_SEED_DATA.length - toCreate.length });
}

export const POST = withErrorHandling(postHandler);
