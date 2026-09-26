import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { PROSPECT_ANNOTATIONS } from "@/lib/prospectAnnotations";

/**
 * POST /api/admin/prospects/annotate
 *
 * Applique les annotations "vente à emporter" / "présence Uber Eats"
 * (voir lib/prospectAnnotations.ts) aux prospects déjà en base -- match par
 * (nom, ville) en minuscules, même logique de dédoublonnage que
 * /api/admin/prospects/seed. Idempotent : peut être rappelé sans risque
 * après une mise à jour de prospectAnnotations.ts.
 *
 * Krys a demandé (26/09/2026) à retirer directement les commerces qui ne
 * font pas de vente à emporter -- donc offersTakeaway === false supprime la
 * ligne plutôt que de la mettre à jour. offersTakeaway === null (pas
 * d'info claire trouvée) ne supprime jamais -- seule une vérification
 * explicite négative entraîne un retrait.
 */
async function postHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const existing = await prisma.prospect.findMany({
    select: { id: true, businessName: true, city: true },
  });
  const byKey = new Map(
    existing.map((p) => [`${p.businessName.toLowerCase()}::${p.city.toLowerCase()}`, p.id])
  );

  let updated = 0;
  let deleted = 0;
  let notFound = 0;

  for (const ann of PROSPECT_ANNOTATIONS) {
    const key = `${ann.businessName.toLowerCase()}::${ann.city.toLowerCase()}`;
    const id = byKey.get(key);
    if (!id) {
      notFound += 1;
      continue;
    }
    if (ann.offersTakeaway === false) {
      await prisma.prospect.delete({ where: { id } });
      deleted += 1;
    } else {
      await prisma.prospect.update({
        where: { id },
        data: { offersTakeaway: ann.offersTakeaway, advertisesUberEats: ann.advertisesUberEats },
      });
      updated += 1;
    }
  }

  return NextResponse.json({ updated, deleted, notFound });
}

export const POST = withErrorHandling(postHandler);
