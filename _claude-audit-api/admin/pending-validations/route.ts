import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/pending-validations
 *
 * Liste consolidée des commerçants et livreurs en attente de validation
 * KYC (status=PENDING). Alimente le dashboard Admin et la page
 * "Validations KYC".
 */
async function getHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const [pendingPros, pendingRiders] = await Promise.all([
    prisma.pro.findMany({
      where: { status: "PENDING" },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        addresses: true,
        openingHours: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.rider.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Decimal Prisma -> nombres JS, même raison que sur toutes les autres
  // routes admin ce soir (sinon .toFixed()/calculs cassés côté front).
  const serializedPros = pendingPros.map((pro) => ({
    ...pro,
    commissionRate: Number(pro.commissionRate),
    rating: pro.rating !== null ? Number(pro.rating) : null,
    googleRating: pro.googleRating !== null ? Number(pro.googleRating) : null,
    addresses: pro.addresses.map((a) => ({ ...a, lat: Number(a.lat), lng: Number(a.lng) })),
  }));
  const serializedRiders = pendingRiders.map((r) => ({
    ...r,
    currentLat: r.currentLat !== null ? Number(r.currentLat) : null,
    currentLng: r.currentLng !== null ? Number(r.currentLng) : null,
    rating: r.rating !== null ? Number(r.rating) : null,
    totalEarnings: Number(r.totalEarnings),
    balance: Number(r.balance),
  }));

  return NextResponse.json({ pendingPros: serializedPros, pendingRiders: serializedRiders });
}

export const GET = withErrorHandling(getHandler);
