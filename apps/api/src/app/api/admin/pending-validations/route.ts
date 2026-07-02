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
      include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.rider.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({ pendingPros, pendingRiders });
}

export const GET = withErrorHandling(getHandler);
