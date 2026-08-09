import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { updateProductOptionsSchema } from "@/lib/validation/products";
import { serializeProduct } from "@/lib/serializeProduct";

/**
 * PUT /api/pros/me/products/[productId]/options
 *
 * Remplace INTÉGRALEMENT les groupes d'options (et leurs choix) d'un
 * produit — c'est plus simple à piloter depuis le formulaire Pro (un seul
 * état "liste de groupes" soumis d'un coup) qu'un CRUD fin par
 * groupe/choix individuel, et le volume de données reste faible (quelques
 * groupes, quelques choix chacun) donc pas de souci de performance à tout
 * recréer à chaque sauvegarde.
 *
 * Body: { options: [{ name, isRequired, isMultiple, choices: [{ name, priceModifier }] }] }
 */
async function putHandler(req: NextRequest, ctx: { params: { productId: string } }) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }

  const product = await prisma.product.findUnique({ where: { id: ctx.params.productId } });
  if (!product || product.proId !== pro.id) {
    throw new ApiError(404, "Produit introuvable.");
  }

  const body = await req.json().catch(() => null);
  const parsed = updateProductOptionsSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  await prisma.$transaction(async (tx) => {
    // OptionChoice a une contrainte de clé étrangère vers ProductOption —
    // on supprime d'abord les choix des options existantes, puis les
    // options elles-mêmes, avant de tout recréer depuis la payload reçue.
    const existingOptions = await tx.productOption.findMany({ where: { productId: product.id }, select: { id: true } });
    const existingOptionIds = existingOptions.map((o) => o.id);

    if (existingOptionIds.length > 0) {
      await tx.optionChoice.deleteMany({ where: { optionId: { in: existingOptionIds } } });
      await tx.productOption.deleteMany({ where: { id: { in: existingOptionIds } } });
    }

    for (const option of parsed.data.options) {
      await tx.productOption.create({
        data: {
          productId: product.id,
          name: option.name,
          isRequired: option.isRequired,
          isMultiple: option.isMultiple,
          choices: { create: option.choices.map((c) => ({ name: c.name, priceModifier: c.priceModifier })) },
        },
      });
    }
  });

  const updated = await prisma.product.findUnique({
    where: { id: product.id },
    include: { options: { include: { choices: true } } },
  });

  return NextResponse.json({ product: updated ? serializeProduct(updated) : null });
}

export const PUT = withErrorHandling(putHandler);
