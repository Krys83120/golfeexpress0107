import { NextRequest, NextResponse } from "next/server";
import { UserRole, ParcelOrderStatus, RiderStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { adminReassignParcelOrderSchema } from "@/lib/validation/parcelOrders";

/**
 * POST /api/admin/parcel-orders/reassign
 *
 * Réassigne (ou retire) le livreur d'une demande Colis Express -- action
 * Admin explicitement demandée par Krys (livreur indisponible en cours de
 * course, dépannage...). N'existe pour AUCUNE autre entité aujourd'hui : la
 * vue Commandes classique reste volontairement lecture seule côté Admin
 * (voir OrdersPage.tsx), Colis Express est une exception assumée.
 *
 * riderId=null retire le livreur assigné et repasse la demande à CONFIRMED
 * -- possible uniquement tant que le colis n'a pas encore été récupéré
 * (status RIDER_ASSIGNED). Au-delà (PICKED_UP/IN_DELIVERY), le livreur a
 * physiquement le colis en main : retirer l'assignation n'aurait plus de
 * sens, seule une réassignation vers un AUTRE livreur reste possible.
 *
 * riderId non-null : réassigne vers ce livreur (doit être ACTIVE). Si la
 * demande était encore CONFIRMED (pas encore de livreur), elle passe à
 * RIDER_ASSIGNED -- même règle que l'auto-assignation côté app Livreur.
 * Si un livreur était déjà en course (RIDER_ASSIGNED/PICKED_UP/IN_DELIVERY),
 * on swap simplement l'id sans toucher pickedUpAt/deliveredAt (ces horodatages
 * tracent des événements physiques, pas l'identité du livreur).
 */
const REASSIGNABLE_STATUSES: string[] = [
  ParcelOrderStatus.CONFIRMED,
  ParcelOrderStatus.RIDER_ASSIGNED,
  ParcelOrderStatus.PICKED_UP,
  ParcelOrderStatus.IN_DELIVERY,
];

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

const INCLUDE = {
  fromAddress: true,
  toAddress: true,
  pro: { select: { id: true, businessName: true } },
  rider: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
} as const;

async function postHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  const parsed = adminReassignParcelOrderSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }
  const { parcelOrderId, riderId } = parsed.data;

  const parcelOrder = await prisma.parcelOrder.findUnique({ where: { id: parcelOrderId } });
  if (!parcelOrder) {
    throw new ApiError(404, "Demande Colis Express introuvable.");
  }
  if (!REASSIGNABLE_STATUSES.includes(parcelOrder.status)) {
    throw new ApiError(400, "Cette demande n'est pas dans un état permettant une réassignation.");
  }

  if (riderId === null) {
    if (parcelOrder.status !== ParcelOrderStatus.RIDER_ASSIGNED) {
      throw new ApiError(400, "Le livreur ne peut être retiré qu'avant la récupération du colis.");
    }
    const updated = await prisma.parcelOrder.update({
      where: { id: parcelOrderId },
      data: { riderId: null, riderAssignedAt: null, status: ParcelOrderStatus.CONFIRMED },
      include: INCLUDE,
    });
    console.log(
      `[admin/parcel-orders/reassign] ${auth.email} a retiré le livreur de la demande ${parcelOrder.parcelNumber}.`
    );
    return NextResponse.json({ parcelOrder: serializeParcelOrder(updated) });
  }

  const rider = await prisma.rider.findUnique({ where: { id: riderId } });
  if (!rider) {
    throw new ApiError(404, "Livreur introuvable.");
  }
  if (rider.status !== RiderStatus.ACTIVE) {
    throw new ApiError(400, "Ce livreur n'est pas actif.");
  }

  const updateData: Record<string, unknown> = { riderId, riderAssignedAt: new Date() };
  if (parcelOrder.status === ParcelOrderStatus.CONFIRMED) {
    updateData.status = ParcelOrderStatus.RIDER_ASSIGNED;
  }

  const updated = await prisma.parcelOrder.update({
    where: { id: parcelOrderId },
    data: updateData,
    include: INCLUDE,
  });

  console.log(
    `[admin/parcel-orders/reassign] ${auth.email} a assigné le livreur ${riderId} à la demande ${parcelOrder.parcelNumber}.`
  );

  return NextResponse.json({ parcelOrder: serializeParcelOrder(updated) });
}

export const POST = withErrorHandling(postHandler);
