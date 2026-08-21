import { NextRequest, NextResponse } from "next/server";
import { UserRole, OrderStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

interface TargetInput {
  rating: number;
  comment?: string;
}

interface ProductInput {
  productId: string;
  rating: number;
  comment?: string;
}

interface ReviewBody {
  pro?: TargetInput;
  rider?: TargetInput;
  platform?: TargetInput;
  products?: ProductInput[];
}

function isValidRating(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

/**
 * GET /api/orders/[orderId]/review
 *
 * Renvoie l'avis déjà laissé pour cette commande (s'il existe), tous
 * volets confondus : Review (commerçant/livreur/plateforme, peut être null
 * si le client n'a encore rien laissé sur ces 3 cibles-là) et
 * ProductReview[] (avis produit par produit, entièrement indépendants).
 * Utilisé par l'app Client pour savoir si l'écran d'avis doit s'afficher
 * en mode "déjà noté" (lecture seule) ou "formulaire".
 */
async function getHandler(req: NextRequest, { params }: { params: { orderId: string } }) {
  const auth = await requireAuth(req, [UserRole.CLIENT]);

  const client = await prisma.client.findUnique({ where: { userId: auth.userId } });
  if (!client) {
    throw new ApiError(404, "Profil client introuvable.");
  }

  const order = await prisma.order.findUnique({ where: { id: params.orderId } });
  if (!order || order.clientId !== client.id) {
    throw new ApiError(404, "Commande introuvable.");
  }

  const [review, productReviews] = await Promise.all([
    prisma.review.findUnique({ where: { orderId: order.id } }),
    prisma.productReview.findMany({ where: { orderId: order.id } }),
  ]);

  return NextResponse.json({ review, productReviews });
}

/**
 * POST /api/orders/[orderId]/review
 *
 * Dépose un avis pour une commande livrée -- REDESIGN (voir prisma/schema.prisma
 * model Review/ProductReview pour le contexte complet) : le client choisit
 * librement CE QU'IL VEUT NOTER, chaque cible est indépendante avec son
 * propre commentaire :
 *   - `pro`      : avis sur le commerçant
 *   - `rider`    : avis sur le livreur de cette commande (refusé si la
 *                  commande n'a pas eu de livreur assigné)
 *   - `platform` : avis sur l'application Do You Geckoo elle-même
 *   - `products` : un avis par produit réellement acheté dans cette commande
 *                  (0, 1 ou plusieurs produits notés, chacun avec sa propre
 *                  note/commentaire) -- alimente Product.rating affiché sur
 *                  la fiche du produit.
 *
 * Toutes ces clés sont optionnelles, mais au moins une doit être fournie.
 * Un seul envoi par commande (comme avant) : si un avis (Review ou
 * ProductReview) existe déjà pour cette commande, la requête est refusée.
 */
async function postHandler(req: NextRequest, { params }: { params: { orderId: string } }) {
  const auth = await requireAuth(req, [UserRole.CLIENT]);

  const client = await prisma.client.findUnique({ where: { userId: auth.userId } });
  if (!client) {
    throw new ApiError(404, "Profil client introuvable.");
  }

  const order = await prisma.order.findUnique({ where: { id: params.orderId }, include: { items: true } });
  if (!order || order.clientId !== client.id) {
    throw new ApiError(404, "Commande introuvable.");
  }

  if (order.status !== OrderStatus.DELIVERED) {
    throw new ApiError(400, "Seule une commande livrée peut être notée.");
  }

  const [existingReview, existingProductReviews] = await Promise.all([
    prisma.review.findUnique({ where: { orderId: order.id } }),
    prisma.productReview.findMany({ where: { orderId: order.id } }),
  ]);
  if (existingReview || existingProductReviews.length > 0) {
    throw new ApiError(409, "Vous avez déjà laissé un avis pour cette commande.");
  }

  const body = (await req.json()) as ReviewBody;

  const targets: Array<[keyof ReviewBody, TargetInput | undefined]> = [
    ["pro", body.pro],
    ["rider", body.rider],
    ["platform", body.platform],
  ];
  for (const [key, target] of targets) {
    if (target && !isValidRating(target.rating)) {
      throw new ApiError(400, `Note invalide pour "${key}" (doit être un entier de 1 à 5).`);
    }
  }
  if (body.rider && !order.riderId) {
    throw new ApiError(400, "Cette commande n'a pas eu de livreur assigné.");
  }

  const orderProductIds = new Set(order.items.map((item) => item.productId));
  const productInputs = new Map<string, ProductInput>();
  for (const p of body.products ?? []) {
    if (!orderProductIds.has(p.productId)) {
      throw new ApiError(400, "Un des produits notés ne fait pas partie de cette commande.");
    }
    if (!isValidRating(p.rating)) {
      throw new ApiError(400, "Note invalide pour un produit (doit être un entier de 1 à 5).");
    }
    // Déduplique par productId si jamais le client a soumis deux fois le même produit.
    productInputs.set(p.productId, p);
  }

  const hasOrderLevelTarget = !!(body.pro || body.rider || body.platform);
  if (!hasOrderLevelTarget && productInputs.size === 0) {
    throw new ApiError(400, "Merci de noter au moins un élément (commerçant, livreur, plateforme ou un produit).");
  }

  const review = hasOrderLevelTarget
    ? await prisma.review.create({
        data: {
          clientId: client.id,
          proId: order.proId,
          riderId: order.riderId,
          orderId: order.id,
          proRating: body.pro?.rating,
          proComment: body.pro?.comment?.trim() || undefined,
          riderRating: body.rider?.rating,
          riderComment: body.rider?.comment?.trim() || undefined,
          platformRating: body.platform?.rating,
          platformComment: body.platform?.comment?.trim() || undefined,
        },
      })
    : null;

  const productReviews = await Promise.all(
    Array.from(productInputs.values()).map((p) =>
      prisma.productReview.create({
        data: {
          clientId: client.id,
          orderId: order.id,
          productId: p.productId,
          rating: p.rating,
          comment: p.comment?.trim() || undefined,
        },
      })
    )
  );

  // Recalcule les moyennes affichées ailleurs (fiche commerçant, fiche
  // livreur, fiche produit) à partir de TOUS les avis en base plutôt qu'en
  // incrémentant une moyenne existante -- plus simple et évite toute dérive
  // en cas de modération (avis masqué) ou de bug antérieur.
  if (body.pro) {
    const agg = await prisma.review.aggregate({
      where: { proId: order.proId, proRating: { not: null }, isVisible: true },
      _avg: { proRating: true },
      _count: { proRating: true },
    });
    await prisma.pro.update({
      where: { id: order.proId },
      data: { rating: agg._avg.proRating ?? null, ratingCount: agg._count.proRating },
    });
  }

  if (body.rider && order.riderId) {
    const agg = await prisma.review.aggregate({
      where: { riderId: order.riderId, riderRating: { not: null }, isVisible: true },
      _avg: { riderRating: true },
      _count: { riderRating: true },
    });
    await prisma.rider.update({
      where: { id: order.riderId },
      data: { rating: agg._avg.riderRating ?? null, ratingCount: agg._count.riderRating },
    });
  }

  for (const productId of productInputs.keys()) {
    const agg = await prisma.productReview.aggregate({
      where: { productId, isVisible: true },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.product.update({
      where: { id: productId },
      data: { rating: agg._avg.rating ?? null, ratingCount: agg._count.rating },
    });
  }

  return NextResponse.json({ review, productReviews });
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);
