import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { createProductSchema } from "@/lib/validation/products";
import { serializeProduct, serializeProductWithoutOptions } from "@/lib/serializeProduct";
/**
 * GET /api/pros/me/products
 * Liste tous les produits du Pro connecté (tous statuts, y compris non
 * disponibles — c'est la vue "gestion de menu", pas la vue publique client).
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);
  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }
  const products = await prisma.product.findMany({
    where: { proId: pro.id },
    // orderBy imbriqué obligatoire sur options ET choices -- sans lui,
    // l'ordre renvoyé par Prisma/Postgres n'est pas garanti stable (dépend
    // du plan d'exécution, pas de l'ordre de création), ce qui mélangeait
    // l'ordre des groupes/choix affichés dans ProductFormModal.tsx par
    // rapport à celui que le Pro a lui-même configuré. Voir
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
  // en texte côté JSON et cassent les calculs/affichages côté front.
  const serialized = products.map(serializeProduct);
  return NextResponse.json({ products: serialized });
}
/**
 * POST /api/pros/me/products
 * Body: { name, description?, price, image?, category, isAvailable?, isFeatured? }
 */
async function postHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);
  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }
  const body = await req.json().catch(() => null);
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }
  const product = await prisma.product.create({
    data: { ...parsed.data, proId: pro.id },
  });
  return NextResponse.json({ product: serializeProductWithoutOptions(product) }, { status: 201 });
}
export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
