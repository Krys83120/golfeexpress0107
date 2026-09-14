import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { serializeProduct } from "@/lib/serializeProduct";
/**
 * GET /api/pros/[proId]/products
 *
 * Menu public d'un commerçant — seuls les produits disponibles
 * (isAvailable=true) sont renvoyés, contrairement à
 * GET /api/pros/me/products (vue de gestion côté Pro, qui montre tout).
 */
async function getHandler(req: NextRequest, ctx: { params: { proId: string } }) {
  const pro = await prisma.pro.findUnique({ where: { id: ctx.params.proId } });
  if (!pro || pro.status !== "ACTIVE") {
    throw new ApiError(404, "Commerçant introuvable.");
  }
  const products = await prisma.product.findMany({
    where: { proId: pro.id, isAvailable: true },
    // orderBy imbriqué obligatoire sur options ET choices -- sans lui,
    // l'ordre renvoyé par Prisma/Postgres n'est pas garanti stable (dépend
    // du plan d'exécution, pas de l'ordre de création), ce qui mélangeait
    // l'ordre des groupes/choix affichés côté Client (ProductOptionsModal.tsx)
    // par rapport à celui configuré par le Pro (ProductFormModal.tsx). Voir
    // ProductOption.sortOrder / OptionChoice.sortOrder dans schema.prisma.
    include: {
      options: {
        orderBy: { sortOrder: "asc" },
        include: { choices: { orderBy: { sortOrder: "asc" } } },
      },
    },
    // Même remarque pour l'ordre des PRODUITS au sein d'une catégorie
    // ("sous-catégorie" côté admin, voir Product.sortOrder, réglable par
    // glisser-déposer depuis AdminCategoryManagerModal.tsx). L'ordre des
    // CATÉGORIES elles-mêmes (alphabétique ici) n'a pas d'importance : c'est
    // le tableau `categories` ci-dessous, avec son propre ordre, que l'app
    // Client utilise pour l'ordre d'affichage des vignettes catégorie.
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });
  // Decimal Prisma (price, priceModifier) -> nombres JS, sinon sérialisés
  // en texte côté JSON et cassent .toFixed()/les calculs côté app Client.
  const serialized = products.map(serializeProduct);

  // Métadonnées d'affichage des catégories (ordre + photo optionnelle,
  // réglables depuis l'admin -- voir model MenuCategory). Une catégorie qui
  // n'a jamais été personnalisée n'a pas de ligne ici : elle est placée
  // après celles personnalisées, triée alphabétiquement, sans photo (repli
  // emoji côté Client -- voir ProDetailScreen.tsx).
  const distinctCategoryNames = Array.from(new Set(products.map((p) => p.category)));
  const menuCategories = distinctCategoryNames.length
    ? await prisma.menuCategory.findMany({ where: { proId: pro.id, name: { in: distinctCategoryNames } } })
    : [];
  const byName = new Map(menuCategories.map((c) => [c.name, c]));
  const categories = distinctCategoryNames
    .map((name) => {
      const custom = byName.get(name);
      return { name, image: custom?.image ?? null, sortOrder: custom?.sortOrder ?? null };
    })
    .sort((a, b) => {
      if (a.sortOrder !== null && b.sortOrder !== null) return a.sortOrder - b.sortOrder;
      if (a.sortOrder !== null) return -1;
      if (b.sortOrder !== null) return 1;
      return a.name.localeCompare(b.name, "fr");
    });

  return NextResponse.json({ products: serialized, categories });
}
export const GET = withErrorHandling(getHandler);
