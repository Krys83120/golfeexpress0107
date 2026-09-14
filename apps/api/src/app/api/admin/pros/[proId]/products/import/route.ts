import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { parseMenuCsv } from "@/lib/adminMenuImport";

const bodySchema = z.object({
  csv: z.string().min(1, "Fichier CSV vide."),
});

/**
 * POST /api/admin/pros/[proId]/products/import
 *
 * Import en masse de produits (+ groupes d'options + choix) pour un Pro
 * donné, directement depuis l'admin -- sans passer par le compte du Pro
 * concerné (import CSV manuel pour les Pro qui ne veulent pas saisir
 * eux-mêmes leur menu). Ouvert à ADMIN et SUPER_ADMIN (14/09/2026, sur
 * demande explicite -- initialement restreint au seul SUPER_ADMIN, élargi
 * car le compte utilisé au quotidien est un compte ADMIN standard).
 *
 * Tout ou rien : le fichier est entièrement validé (voir parseMenuCsv)
 * avant la moindre écriture -- une seule ligne invalide bloque tout
 * l'import et renvoie le détail des erreurs, plutôt que de laisser un
 * import partiel à démêler à la main. L'écriture elle-même passe par une
 * transaction Prisma pour la même raison (soit tous les produits sont
 * créés, soit aucun).
 */
async function postHandler(req: NextRequest, { params }: { params: { proId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const pro = await prisma.pro.findUnique({ where: { id: params.proId }, select: { id: true } });
  if (!pro) {
    throw new ApiError(404, "Commerçant introuvable.");
  }

  const json = await req.json().catch(() => null);
  const parsedBody = bodySchema.safeParse(json);
  if (!parsedBody.success) {
    throw new ApiError(400, parsedBody.error.errors[0]?.message ?? "Requête invalide.");
  }

  const { products, errors } = parseMenuCsv(parsedBody.data.csv);

  if (errors.length > 0) {
    throw new ApiError(400, errors.join("\n"));
  }
  if (products.length === 0) {
    throw new ApiError(400, "Aucun produit à importer.");
  }

  await prisma.$transaction(
    products.map((p) =>
      prisma.product.create({
        data: {
          proId: pro.id,
          name: p.name,
          category: p.category,
          price: p.price,
          description: p.description,
          isAvailable: p.isAvailable,
          options: {
            create: p.options.map((o, oIndex) => ({
              name: o.name,
              isRequired: o.isRequired,
              isMultiple: o.isMultiple,
              maxChoices: o.maxChoices,
              sortOrder: oIndex,
              choices: {
                create: o.choices.map((c) => ({
                  name: c.name,
                  priceModifier: c.priceModifier,
                  isAvailable: c.isAvailable,
                })),
              },
            })),
          },
        },
      })
    )
  );

  return NextResponse.json({
    importedCount: products.length,
    productNames: products.map((p) => p.name),
  });
}

export const POST = withErrorHandling(postHandler);
