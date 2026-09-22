import { NextRequest, NextResponse } from "next/server";
import { UserRole, OrderStatus, PaymentStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/admin/orders/[orderId]/mark-test
 *
 * Bascule Order.isTest (demande explicite de Krys, 22/09/2026) -- permet de
 * désigner une commande comme "commande de test" pour pouvoir ensuite la
 * faire avancer manuellement via /test-transition (voir ce fichier),
 * complètement en dehors du circuit réel (aucun paiement Stripe, aucun
 * virement, aucun email).
 *
 * Body: { isTest: boolean }
 *
 * SÉCURITÉ : n'autorisé QUE tant que la commande est encore PENDING et
 * paymentStatus PENDING, c'est-à-dire avant que quoi que ce soit de réel se
 * soit produit dessus (aucun paiement encaissé, aucune transition métier).
 * Impossible donc de "transformer" a posteriori une vraie commande engagée
 * (payée, en préparation, livrée...) en commande de test pour contourner
 * une vérification -- et impossible de décocher isTest une fois que
 * /test-transition a commencé à la faire avancer (voir ce fichier), ce qui
 * éviterait qu'une commande ayant reçu un paymentStatus=CAPTURED "de test"
 * se retrouve comptée comme une vraie commande payée dans les recettes.
 */
async function patchHandler(req: NextRequest, ctx: { params: { orderId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  if (!body || typeof body.isTest !== "boolean") {
    throw new ApiError(400, "Le champ isTest (booléen) est requis.");
  }

  const order = await prisma.order.findUnique({ where: { id: ctx.params.orderId } });
  if (!order) {
    throw new ApiError(404, "Commande introuvable.");
  }

  // Cast nécessaire -- l'enum généré par Prisma pour order.status/paymentStatus
  // est un type TS distinct de celui de @golfeexpress/types (mêmes valeurs),
  // même correctif que `order.status as OrderStatus` dans
  // orders/[orderId]/status/route.ts.
  if ((order.status as OrderStatus) !== OrderStatus.PENDING || (order.paymentStatus as PaymentStatus) !== PaymentStatus.PENDING) {
    throw new ApiError(
      400,
      "Cette commande a déjà été engagée (payée ou plus avancée) -- impossible de changer son statut de test."
    );
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { isTest: body.isTest },
  });

  return NextResponse.json({ order: updated });
}

export const PATCH = withErrorHandling(patchHandler);
