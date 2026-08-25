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
 * Body: {
 *   options: [{ name, isRequired, isMultiple, maxChoices, choices: [{ name, priceModifier, isAvailable, unavailableUntil }] }],
 *   allowSpecialInstructions?, hasExtraFeeNotice?
 * }
 * Les deux derniers champs sont les réglages produit affichés dans le même
 * bloc "🧩 Options" du formulaire Pro (voir ProductFormModal.tsx) -- omis
 * (undefined) = inchangés côté serveur, jamais réinitialisés à false.
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
          // Un choix maxi n'a de sens que pour un groupe à choix multiples --
          // même garde que côté formulaire Pro (ProductFormModal.tsx) pour
          // éviter qu'une valeur oubliée sur un groupe à choix unique ne
          // bloque silencieusement sa sélection (voir aussi
          // assertWithinMaxChoices dans orders/route.ts qui s'appuie sur ce
          // champ à la création de la commande).
          maxChoices: option.isMultiple ? option.maxChoices ?? null : null,
          choices: {
            create: option.choices.map((c) => ({
              name: c.name,
              priceModifier: c.priceModifier,
              // Rupture sur ce choix précis (ex: "plus de mâche") -- même
              // principe que Product.isAvailable/unavailableUntil, voir
              // orders/route.ts pour la revalidation côté serveur à la
              // commande et le Cron pour la remise à disponible automatique.
              isAvailable: c.isAvailable,
              unavailableUntil: c.unavailableUntil ?? null,
            })),
          },
        },
      });
    }
    // Réglages produit portés par ce même endpoint (voir la note en tête de
    // fichier) -- undefined = champ non transmis par le client, Prisma
    // n'écrase alors pas la valeur existante en base.
    await tx.product.update({
      where: { id: product.id },
      data: {
        allowSpecialInstructions: parsed.data.allowSpecialInstructions,
        hasExtraFeeNotice: parsed.data.hasExtraFeeNotice,
      },
    });
  });
  const updated = await prisma.product.findUnique({
    where: { id: product.id },
    include: { options: { include: { choices: true } } },
  });
  return NextResponse.json({ product: updated ? serializeProduct(updated) : null });
}

export const PUT = withErrorHandling(putHandler);
