import { NextRequest, NextResponse } from "next/server";
import { ParcelOrderStatus, UserRole, RiderStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { notifyNearbyRidersForParcelOrder } from "@/lib/riderNotifications";

/**
 * GET /api/riders/me/available-parcel-orders
 *
 * Liste les demandes Colis Express disponibles pour ce livreur -- finition
 * du workflow Livreur (23/09/2026, suite à l'audit du 23/09/2026 : la
 * fonctionnalité existait déjà côté Pro/Admin/paiement mais n'était encore
 * visible nulle part côté Livreur -- voir riders/me/available-orders, qui
 * ne traitait jusqu'ici que les commandes classiques).
 *
 * Même principe exact que GET /api/riders/me/available-orders, en plus
 * simple : pas d'équivalent PREPARING/fenêtre de recherche anticipée pour
 * Colis Express (pas de temps de "préparation" -- une demande payée
 * (CONFIRMED, pas encore assignée) est immédiatement prête à être
 * récupérée).
 *
 * Notifications push "colis à proximité" -- piggybackées sur ce même
 * endpoint, interrogé en polling par l'app Livreur, exactement comme pour
 * available-orders (voir notifyNearbyRidersForParcelOrder, même verrou
 * anti-doublon via ParcelOrder.riderNotifiedAt).
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.RIDER]);

  const rider = await prisma.rider.findUnique({ where: { userId: auth.userId } });
  if (!rider) {
    throw new ApiError(404, "Profil livreur introuvable.");
  }
  if (rider.status !== RiderStatus.ACTIVE) {
    throw new ApiError(403, "Votre compte livreur n'est pas encore activé.");
  }

  const parcelOrders = await prisma.parcelOrder.findMany({
    where: { riderId: null, status: ParcelOrderStatus.CONFIRMED },
    include: {
      fromAddress: true,
      toAddress: true,
      pro: { select: { id: true, businessName: true, logo: true } },
    },
    orderBy: { placedAt: "asc" },
    take: 40,
  });

  await Promise.all(
    parcelOrders
      .filter((p) => p.riderNotifiedAt === null)
      .map(async (p) => {
        try {
          const claim = await prisma.parcelOrder.updateMany({
            where: { id: p.id, riderNotifiedAt: null },
            data: { riderNotifiedAt: new Date() },
          });
          if (claim.count === 1) {
            await notifyNearbyRidersForParcelOrder(p);
          }
        } catch (err) {
          console.error(`[available-parcel-orders] Échec notification proximité (colis ${p.id}):`, err);
        }
      })
  );

  // deliveryFee/expressFee/total/riderEarnings/platformEarnings et les
  // lat/lng d'adresses sont des Decimal Prisma -- même sérialisation que
  // partout ailleurs sur Colis Express (voir parcel-orders/route.ts).
  const serialized = parcelOrders.map((p) => ({
    ...p,
    deliveryFee: Number(p.deliveryFee),
    expressFee: Number(p.expressFee),
    total: Number(p.total),
    riderEarnings: Number(p.riderEarnings),
    platformEarnings: Number(p.platformEarnings),
    fromAddress: { ...p.fromAddress, lat: Number(p.fromAddress.lat), lng: Number(p.fromAddress.lng) },
    toAddress: { ...p.toAddress, lat: Number(p.toAddress.lat), lng: Number(p.toAddress.lng) },
  }));

  return NextResponse.json({ parcelOrders: serialized });
}

export const GET = withErrorHandling(getHandler);
