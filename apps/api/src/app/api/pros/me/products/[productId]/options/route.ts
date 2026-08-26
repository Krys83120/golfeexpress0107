import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
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
 * groupe/choix individuel. Insertion en 2 requêtes groupées (createMany
 * groupes, puis createMany choix, ids pré-générés côté serveur) plutôt
 * qu'une requête par groupe -- avec beaucoup de groupes/choix, la version
 * "une requête par groupe" dépassait le timeout par défaut d'une
 * transaction interactive Prisma (5s), d'où ce choix même si le volume de
 * données reste modeste par produit.
 *
 * Body: {
 *   options: [{ name, isRequired, isMultiple, maxChoices, dependsOn: {groupIndex, choiceIndex} | null, choices: [{ name, priceModifier, isAvailable, unavailableUntil, allowMultipleQty }] }],
 *   allowSpecialInstructions?, hasExtraFeeNotice?
 * }
 * `dependsOn` référence un choix par POSITION dans le tableau `options` reçu
 * (groupIndex/choiceIndex) -- jamais par id, car tous les ids sont recréés à
 * chaque sauvegarde (voir plus bas). Résolu vers un vrai OptionChoice.id en
 * base dans une seconde passe une fois tous les groupes/choix créés (voir
 * ProductOption.dependsOnChoiceId dans schema.prisma).
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
  await prisma.$transaction(
    async (tx) => {
      // OptionChoice a une contrainte de clé étrangère vers ProductOption —
      // on supprime d'abord les choix des options existantes, puis les
      // options elles-mêmes, avant de tout recréer depuis la payload reçue.
      const existingOptions = await tx.productOption.findMany({ where: { productId: product.id }, select: { id: true } });
      const existingOptionIds = existingOptions.map((o) => o.id);
      if (existingOptionIds.length > 0) {
        await tx.optionChoice.deleteMany({ where: { optionId: { in: existingOptionIds } } });
        await tx.productOption.deleteMany({ where: { id: { in: existingOptionIds } } });
      }
      // Ids pré-générés côté serveur (au lieu de laisser Postgres les
      // générer via @default(uuid()) à l'insertion) -- permet d'insérer
      // TOUS les groupes en une seule requête groupée (createMany), puis
      // TOUS les choix en une seule autre, plutôt qu'une requête `create`
      // PAR GROUPE comme avant. Sur un produit avec beaucoup de groupes/
      // choix (ex: plusieurs "Extra ..." + groupes de suppléments), la
      // version "une requête par groupe" (toutes attendues en séquence
      // dans la même transaction) pouvait dépasser le timeout par défaut
      // d'une transaction interactive Prisma (5s) -- symptôme observé :
      // 500 sur cette route pour un produit avec beaucoup d'options, alors
      // que ça fonctionnait pour un produit avec 1-2 groupes. Voir aussi le
      // timeout explicite passé à $transaction ci-dessous, en filet de
      // sécurité supplémentaire.
      const optionIds = parsed.data.options.map(() => randomUUID());
      const choiceIdsByOption = parsed.data.options.map((option) => option.choices.map(() => randomUUID()));

      // sortOrder = position dans le tableau reçu (celui affiché/réordonné
      // par le Pro dans ProductFormModal.tsx) -- indispensable pour que
      // TOUTE lecture ultérieure (ticket de préparation,
      // ProductOptionsModal.tsx côté Client, formulaire Pro) réaffiche les
      // groupes/choix dans le même ordre, l'ordre implicite d'une requête
      // Prisma sans `orderBy` n'étant pas garanti stable (voir
      // ProductOption.sortOrder dans schema.prisma).
      //
      // dependsOnChoiceId n'est PAS renseigné ici : le choix référencé
      // n'existe pas encore à ce stade (OptionChoice est créé juste après,
      // jamais avant -- sa propre FK exige que son ProductOption existe
      // déjà). Voir la passe suivante.
      await tx.productOption.createMany({
        data: parsed.data.options.map((option, optionIndex) => ({
          id: optionIds[optionIndex],
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
          sortOrder: optionIndex,
        })),
      });

      await tx.optionChoice.createMany({
        data: parsed.data.options.flatMap((option, optionIndex) =>
          option.choices.map((c, choiceIndex) => ({
            id: choiceIdsByOption[optionIndex][choiceIndex],
            optionId: optionIds[optionIndex],
            name: c.name,
            priceModifier: c.priceModifier,
            // Rupture sur ce choix précis (ex: "plus de mâche") -- même
            // principe que Product.isAvailable/unavailableUntil, voir
            // orders/route.ts pour la revalidation côté serveur à la
            // commande et le Cron pour la remise à disponible automatique.
            isAvailable: c.isAvailable,
            unavailableUntil: c.unavailableUntil ?? null,
            // Quantité multiple pour CE choix précis (ex: "Bacon" x4) --
            // n'a de sens que pour un groupe à choix multiples, même garde
            // que maxChoices ci-dessus (voir aussi assertQuantifiableChoices
            // dans orders/route.ts qui s'appuie sur ce champ à la création
            // de la commande).
            allowMultipleQty: option.isMultiple ? c.allowMultipleQty : false,
            sortOrder: choiceIndex,
          }))
        ),
      });

      // Passe finale : résout chaque `dependsOn` (position dans le tableau
      // reçu) vers le vrai OptionChoice.id pré-généré ci-dessus, et
      // l'enregistre sur le ProductOption correspondant -- ne concerne QUE
      // les groupes réellement conditionnels (typiquement 0 à quelques-uns
      // sur un produit, jamais tous), donc son coût reste négligeable même
      // sur un produit avec beaucoup de groupes. Le schéma de validation
      // (updateProductOptionsSchema) garantit déjà que groupIndex/choiceIndex
      // sont dans les bornes et pointent vers un groupe défini AVANT celui-ci.
      for (const [optionIndex, option] of parsed.data.options.entries()) {
        if (!option.dependsOn) continue;
        const targetChoiceId = choiceIdsByOption[option.dependsOn.groupIndex]?.[option.dependsOn.choiceIndex];
        if (!targetChoiceId) continue; // déjà validé en amont, filet de sécurité seulement
        await tx.productOption.update({
          where: { id: optionIds[optionIndex] },
          data: { dependsOnChoiceId: targetChoiceId },
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
    },
    // Filet de sécurité supplémentaire (voir commentaire ci-dessus) : porte
    // le timeout par défaut de 5s à 15s, au cas où Supabase répondrait
    // ponctuellement plus lentement que d'habitude -- le vrai fix reste le
    // passage à des requêtes groupées (createMany) ci-dessus.
    { timeout: 15000 }
  );
  const updated = await prisma.product.findUnique({
    where: { id: product.id },
    // orderBy imbriqué obligatoire -- voir le commentaire sur
    // ProductOption.sortOrder dans schema.prisma.
    include: {
      options: {
        orderBy: { sortOrder: "asc" },
        include: { choices: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  return NextResponse.json({ product: updated ? serializeProduct(updated) : null });
}
export const PUT = withErrorHandling(putHandler);
