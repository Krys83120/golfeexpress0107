import { NextRequest, NextResponse } from "next/server";
import { ParcelOrderStatus, UserRole, RiderStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToPro } from "@/lib/webPush";

/**
 * POST /api/parcel-orders/accept
 * Body: { parcelOrderId }
 *
 * Un livreur accepte une demande Colis Express et se l'assigne -- finition
 * du workflow Livreur (23/09/2026). Même principe exact que
 * POST /api/orders/[orderId]/accept : update conditionnel atomique
 * (`where` inclut riderId: null ET status: CONFIRMED) pour éviter qu'un
 * deuxième livreur ne "prenne" la même demande entre deux requêtes
 * concurrentes -- seul le premier appel qui arrive en base gagne, le
 * second échoue en 409.
 *
 * Chemin volontairement à plat (parcelOrderId dans le corps), même
 * convention que le reste de Colis Express (voir parcel-orders/route.ts).
 */
async function postHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.RIDER]);

  const rider = await prisma.rider.findUnique({ where: { userId: auth.userId } });
  if (!rider) {
    throw new ApiError(404, "Profil livreur introuvable.");
  }
  if (rider.status !== RiderStatus.ACTIVE) {
    throw new ApiError(403, "Votre compte livreur n'est pas encore activé.");
  }
  if (!rider.isOnline) {
    throw new ApiError(400, "Vous devez être en ligne pour accepter une course.");
  }

  const body = await req.json().catch(() => null);
  const parcelOrderId = typeof body?.parcelOrderId === "string" ? body.parcelOrderId : null;
  if (!parcelOrderId) {
    throw new ApiError(400, "parcelOrderId requis.");
  }

  const parcelOrder = await prisma.parcelOrder.findUnique({ where: { id: parcelOrderId } });
  if (!parcelOrder) {
    throw new ApiError(404, "Demande Colis Express introuvable.");
  }
  if (parcelOrder.status !== ParcelOrderStatus.CONFIRMED || parcelOrder.riderId) {
    throw new ApiError(409, "Cette demande n'est plus disponible (déjà prise par un autre livreur).");
  }

  // updateMany avec une clause where stricte = équivalent d'un UPDATE ...
  // WHERE id = ? AND rider_id IS NULL AND status = 'CONFIRMED' atomique côté
  // Postgres -- si un autre rider a accepté entre le findUnique ci-dessus et
  // cet appel, `count` sera 0.
  const result = await prisma.parcelOrder.updateMany({
    where: { id: parcelOrder.id, riderId: null, status: ParcelOrderStatus.CONFIRMED },
    data: { status: ParcelOrderStatus.RIDER_ASSIGNED, riderId: rider.id, riderAssignedAt: new Date() },
  });

  if (result.count === 0) {
    throw new ApiError(409, "Cette demande vient d'être prise par un autre livreur.");
  }

  const updated = await prisma.parcelOrder.findUnique({
    where: { id: parcelOrder.id },
    include: {
      fromAddress: true,
      toAddress: true,
      pro: { select: { id: true, businessName: true, logo: true } },
    },
  });

  if (updated) {
    // Best-effort, jamais bloquant -- même principe que le reste des
    // notifications Colis Express (voir parcel-orders/status/route.ts).
    sendPushToPro(updated.proId, {
      title: "🛵 Livreur trouvé",
      body: `Votre demande Colis Express ${updated.parcelNumber} a été prise en charge.`,
      url: "/",
    }).catch((err) => console.error("[parcel-orders/accept] Échec push pro:", err));
  }

  return NextResponse.json({
    parcelOrder: updated
      ? {
          ...updated,
          deliveryFee: Number(updated.deliveryFee),
          expressFee: Number(updated.expressFee),
          total: Number(updated.total),
          riderEarnings: Number(updated.riderEarnings),
          platformEarnings: Number(updated.platformEarnings),
          fromAddress: { ...updated.fromAddress, lat: Number(updated.fromAddress.lat), lng: Number(updated.fromAddress.lng) },
          toAddress: { ...updated.toAddress, lat: Number(updated.toAddress.lat), lng: Number(updated.toAddress.lng) },
        }
      : null,
  });
}

export const POST = withErrorHandling(postHandler);
