import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/products/[productId]/reviews
 *
 * Avis clients visibles pour un produit précis -- route PUBLIQUE, comme
 * GET /api/pros/[proId]/reviews. Alimente la fiche produit (app Client,
 * ProductOptionsModal) : la moyenne (Product.rating/ratingCount) est déjà
 * renvoyée avec le produit lui-même (GET /api/pros/[proId]/products) --
 * cette route ajoute le détail (commentaires) derrière cette moyenne.
 *
 * Entièrement indépendant des avis Review (commerçant/livreur/plateforme)
 * -- voir model ProductReview.
 */
async function getHandler(_req: NextRequest, { params }: { params: { productId: string } }) {
  const reviews = await prisma.productReview.findMany({
    where: { productId: params.productId, isVisible: true },
    include: { client: { select: { user: { select: { firstName: true, lastName: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ reviews });
}

export const GET = withErrorHandling(getHandler);
