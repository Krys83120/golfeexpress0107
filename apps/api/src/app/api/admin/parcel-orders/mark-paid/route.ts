import { NextRequest, NextResponse } from "next/server";
import { UserRole, ParcelOrderStatus, PaymentStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { adminMarkPaidParcelOrderSchema } from "@/lib/validation/parcelOrders";

/**
 * POST /api/admin/parcel-orders/mark-paid
 *
 * Marque manuellement une demande Colis Express comme payée (19/09/2026 --
 * demande explicite de Krys, pour le cas où Stripe a bien confirmé le
 * paiement mais où le webhook payment_intent.succeeded n'est jamais arrivé
 * jusqu'à nous -- ou tout autre dépannage où le Pro a réglé la course par un
 * autre moyen). Réplique EXACTEMENT ce que fait le webhook Stripe dans ce
 * cas (voir apps/api/src/app/api/webhooks/stripe/route.ts, branche
 * payment_intent.succeeded) -- paymentStatus CAPTURED, et avancement du
 * statut PENDING -> CONFIRMED si la demande était encore en attente -- sans
 * toucher au webhook lui-même : pur ajout, jamais un contournement de la
 * logique de confirmation normale.
 *
 * Ne renseigne PAS cardBrand/cardLast4 (aucune charge réelle constatée par
 * cette route) et n'est pas utilisable sur une demande déjà annulée. Chaque
 * usage est tracé (voir console.log ci-dessous, avec l'email de l'admin) --
 * pas de table d'audit dédiée dans le schéma actuel pour l'instant.
 */
const INCLUDE = {
  fromAddress: true,
  toAddress: true,
  pro: { select: { id: true, businessName: true } },
  rider: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
} as const;

function serializeParcelOrder(p: Record<string, unknown>) {
  const fromAddress = p.fromAddress as Record<string, unknown> | null | undefined;
  const toAddress = p.toAddress as Record<string, unknown> | null | undefined;
  return {
    ...p,
    deliveryFee: Number(p.deliveryFee),
    expressFee: Number(p.expressFee),
    total: Number(p.total),
    riderEarnings: Number(p.riderEarnings),
    platformEarnings: Number(p.platformEarnings),
    fromAddress: fromAddress
      ? { ...fromAddress, lat: Number(fromAddress.lat), lng: Number(fromAddress.lng) }
      : fromAddress,
    toAddress: toAddress
      ? { ...toAddress, lat: Number(toAddress.lat), lng: Number(toAddress.lng) }
      : toAddress,
  };
}

async function postHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  const parsed = adminMarkPaidParcelOrderSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const parcelOrder = await prisma.parcelOrder.findUnique({ where: { id: parsed.data.parcelOrderId } });
  if (!parcelOrder) {
    throw new ApiError(404, "Demande Colis Express introuvable.");
  }
  if (parcelOrder.status === ParcelOrderStatus.CANCELLED) {
    throw new ApiError(400, "Cette demande est annulée -- impossible de la marquer comme payée.");
  }
  if (parcelOrder.paymentStatus === PaymentStatus.CAPTURED) {
    throw new ApiError(400, "Cette demande est déjà marquée comme payée.");
  }

  const wasPending = parcelOrder.status === ParcelOrderStatus.PENDING;

  const updated = await prisma.parcelOrder.update({
    where: { id: parcelOrder.id },
    data: {
      paymentStatus: PaymentStatus.CAPTURED,
      ...(wasPending ? { status: ParcelOrderStatus.CONFIRMED } : {}),
    },
    include: INCLUDE,
  });

  console.log(
    `[admin/parcel-orders/mark-paid] ${auth.email} a marqué la demande ${parcelOrder.parcelNumber} comme payée manuellement (dépannage paiement).`
  );

  return NextResponse.json({ parcelOrder: serializeParcelOrder(updated) });
}

export const POST = withErrorHandling(postHandler);
