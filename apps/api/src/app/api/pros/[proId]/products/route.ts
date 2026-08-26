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
    orderBy: { category: "asc" },
  });
  // Decimal Prisma (price, priceModifier) -> nombres JS, sinon sérialisés
  // en texte côté JSON et cassent .toFixed()/les calculs côté app Client.
  const serialized = products.map(serializeProduct);
  return NextResponse.json({ products: serialized });
}
export const GET = withErrorHandling(getHandler);
