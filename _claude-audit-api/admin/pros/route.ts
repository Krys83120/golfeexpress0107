import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/pros
 *
 * Liste tous les commerçants (tous statuts, contrairement à GET /api/pros
 * qui ne renvoie que les ACTIVE) — vue admin avec infos de gestion
 * (abonnement, nombre de commandes, etc.).
 */
async function getHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const pros = await prisma.pro.findMany({
    include: {
      user: { select: { firstName: true, lastName: true, email: true, phone: true } },
      addresses: { take: 1 },
      openingHours: true,
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Les champs Decimal (lat/lng, rating, commissionRate...) sérialisent en
  // texte par défaut via Prisma -> JSON. On caste explicitement les champs
  // utilisés côté carte pour éviter un .toFixed()/calcul cassé côté front.
  const serialized = pros.map((pro) => ({
    ...pro,
    commissionRate: Number(pro.commissionRate),
    rating: pro.rating !== null ? Number(pro.rating) : null,
    googleRating: pro.googleRating !== null ? Number(pro.googleRating) : null,
    addresses: pro.addresses.map((addr) => ({
      ...addr,
      lat: Number(addr.lat),
      lng: Number(addr.lng),
    })),
  }));

  return NextResponse.json({ pros: serialized });
}

export const GET = withErrorHandling(getHandler);
