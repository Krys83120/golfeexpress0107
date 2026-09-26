import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

interface ImagePair {
  productName: string;
  imageUrl: string;
}

/**
 * POST /api/admin/pros/[proId]/products/set-images
 *
 * Renseigne la photo (Product.image) d'un lot de produits d'un Pro, en les
 * retrouvant par leur NOM (comparaison insensible à la casse/espaces) --
 * pensé pour compléter un import CSV qui ne gère pas encore les images
 * (voir apps/api/src/lib/adminMenuImport.ts) avec des photos récupérées à
 * côté (ex: export/scraping du site vitrine existant d'un Pro), sans
 * toucher à la route d'import elle-même. Totalement additif : ne touche
 * QUE le champ `image`, jamais le reste du produit.
 *
 * Body: { images: { productName: string, imageUrl: string }[] }
 *
 * Un nom sans produit correspondant (ou correspondant à plusieurs produits
 * -- ex: doublons pas encore nettoyés) est simplement ignoré et remonté
 * dans `unmatched`/`ambiguous`, plutôt que de faire échouer tout le lot.
 */
async function postHandler(req: NextRequest, { params }: { params: { proId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const { proId } = params;

  const body = await req.json();
  const images: ImagePair[] = Array.isArray(body?.images) ? body.images : [];

  const products = await prisma.product.findMany({
    where: { proId },
    select: { id: true, name: true },
  });

  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const byName = new Map<string, { id: string; name: string }[]>();
  for (const p of products) {
    const key = normalize(p.name);
    const list = byName.get(key) ?? [];
    list.push(p);
    byName.set(key, list);
  }

  let updatedCount = 0;
  const unmatched: string[] = [];
  const ambiguous: string[] = [];

  for (const { productName, imageUrl } of images) {
    if (!productName || !imageUrl) continue;
    const matches = byName.get(normalize(productName)) ?? [];
    if (matches.length === 0) {
      unmatched.push(productName);
      continue;
    }
    if (matches.length > 1) {
      // Plusieurs produits portent le même nom (doublons d'un import
      // précédent, pas encore nettoyés via .../products/reset) -- on
      // applique quand même la photo à TOUS les produits concernés plutôt
      // que de deviner lequel garder, et on le signale pour info.
      ambiguous.push(productName);
    }
    for (const match of matches) {
      await prisma.product.update({ where: { id: match.id }, data: { image: imageUrl } });
      updatedCount++;
    }
  }

  return NextResponse.json({ updatedCount, unmatched, ambiguous });
}

export const POST = withErrorHandling(postHandler);
