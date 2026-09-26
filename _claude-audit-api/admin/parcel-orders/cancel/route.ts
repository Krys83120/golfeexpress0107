import { NextRequest, NextResponse } from "next/server";
import { UserRole, ParcelOrderStatus, PaymentStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { adminCancelParcelOrderSchema } from "@/lib/validation/parcelOrders";

/**
 * POST /api/admin/parcel-orders/cancel
 *
 * Annule une demande Colis Express -- version Admin (19/09/2026), volontairement
 * plus large que /api/parcel-orders/cancel côté Pro : autorisée jusqu'à
 * IN_DELIVERY inclus (le Pro ne peut annuler que jusqu'à RIDER_ASSIGNED, avant
 * la récupération du colis). L'Admin a besoin de ce pouvoir élargi pour
 * débloquer une course problématique en cours de route (colis perdu, livreur
 * injoignable...) -- demande explicite de Krys pour ce flux.
 *
 * Même logique de remboursement que la version Pro (voir son commentaire) :
 * paiement déjà encaissé -> remboursement Stripe intégral automatique ;
 * paiement créé mais pas confirmé -> annulation best-effort du PaymentIntent.
 */
const ADMIN_CANCELLABLE_STATUSES: string[] = [
  ParcelOrderStatus.PENDING,
  ParcelOrderStatus.CONFIRMED,
  ParcelOrderStatus.RIDER_ASSIGNED,
  ParcelOrderStatus.PICKED_UP,
  ParcelOrderStatus.IN_DELIVERY,
];

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
  const parsed = adminCancelParcelOrderSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const parcelOrder = await prisma.parcelOrder.findUnique({ where: { id: parsed.data.parcelOrderId } });
  if (!parcelOrder) {
    throw new ApiError(404, "Demande Colis Express introuvable.");
  }
  if (!ADMIN_CANCELLABLE_STATUSES.includes(parcelOrder.status)) {
    throw new ApiError(400, "Cette demande ne peut plus être annulée (déjà livrée ou déjà annulée).");
  }

  let paymentStatus = parcelOrder.paymentStatus;

  if (parcelOrder.paymentStatus === PaymentStatus.CAPTURED) {
    if (!parcelOrder.stripePaymentIntentId) {
      throw new ApiError(500, "Paiement marqué comme encaissé mais aucune référence Stripe -- contactez le support.");
    }
    try {
      await stripe.refunds.create({ payment_intent: parcelOrder.stripePaymentIntentId });
      paymentStatus = PaymentStatus.REFUNDED;
    } catch (err) {
      console.error(`[admin/parcel-orders/cancel] Échec remboursement Stripe (${parcelOrder.id}):`, err);
      throw new ApiError(500, "Échec du remboursement -- réessayez dans quelques instants ou contactez le support.");
    }
  } else if (parcelOrder.stripePaymentIntentId) {
    try {
      await stripe.paymentIntents.cancel(parcelOrder.stripePaymentIntentId);
    } catch (err) {
      console.error(`[admin/parcel-orders/cancel] Annulation PaymentIntent best-effort échouée (${parcelOrder.id}):`, err);
    }
  }

  const updated = await prisma.parcelOrder.update({
    where: { id: parcelOrder.id },
    data: { status: ParcelOrderStatus.CANCELLED, cancelledAt: new Date(), paymentStatus },
    include: INCLUDE,
  });

  console.log(
    `[admin/parcel-orders/cancel] ${auth.email} a annulé la demande ${parcelOrder.parcelNumber} (statut avant annulation: ${parcelOrder.status}).`
  );

  return NextResponse.json({ parcelOrder: serializeParcelOrder(updated) });
}

export const POST = withErrorHandling(postHandler);
