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
      user: { select: { firstName: true, lastName: true, email: true } },
      addresses: { take: 1 },
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ pros });
}

export const GET = withErrorHandling(getHandler);
