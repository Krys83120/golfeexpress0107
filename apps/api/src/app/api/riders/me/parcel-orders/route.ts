import { NextRequest, NextResponse } from "next/server";
import { ParcelOrderStatus, UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/riders/me/parcel-orders
 * Query params optionnels : ?status=RIDER_ASSIGNED,PICKED_UP,IN_DELIVERY (CSV)
 *
 * Demandes Colis Express assignées à CE livreur (en cours + historique) --
 * finition du workflow Livreur (23/09/2026). Même principe exact que
 * GET /api/orders (filtre riderId + status en query param, voir ce fichier),
 * version Colis Express : sert à l'app Livreur pour retrouver sa course en
 * cours après un rechargement/redémarrage de l'app (voir
 * useRiderSessionStore.ts, loadActiveParcelDelivery) -- available-parcel-orders/route.ts
 * gère la liste des courses DISPONIBLES (pas encore prises), un besoin
 * différent et déjà couvert par ce fichier-là.
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.RIDER]);

  const rider = await prisma.rider.findUnique({ where: { userId: auth.userId } });
  if (!rider) {
    throw new ApiError(404, "Profil livreur introuvable.");
  }

  const statusParam = req.nextUrl.searchParams.get("status");
  const statusFilter = statusParam ? (statusParam.split(",").filter(Boolean) as ParcelOrderStatus[]) : undefined;

  const parcelOrders = await prisma.parcelOrder.findMany({
    where: {
      riderId: rider.id,
      ...(statusFilter && statusFilter.length > 0 ? { status: { in: statusFilter } } : {}),
    },
    include: {
      fromAddress: true,
      toAddress: true,
      pro: { select: { id: true, businessName: true, logo: true } },
    },
    orderBy: { placedAt: "desc" },
    take: 20,
  });

  // Même sérialisation Decimal -> number que partout ailleurs sur Colis
  // Express (voir available-parcel-orders/route.ts, parcel-orders/route.ts).
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
