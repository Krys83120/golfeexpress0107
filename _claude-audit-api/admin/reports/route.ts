import { NextRequest, NextResponse } from "next/server";
import { UserRole, OrderReportStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/reports
 *
 * Liste toutes les réclamations/signalements de la plateforme (Client,
 * Livreur, Pro confondus), pour la page admin "Réclamations". Filtre
 * optionnel par statut (CSV) -- sans filtre, tout est renvoyé, trié du
 * plus récent au plus ancien.
 *
 * Query params optionnels: ?status=OPEN,IN_PROGRESS
 */
async function getHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const statusParam = req.nextUrl.searchParams.get("status");
  const where = statusParam
    ? { status: { in: statusParam.split(",") as OrderReportStatus[] } }
    : {};

  const reports = await prisma.orderReport.findMany({
    where,
    include: {
      order: { select: { id: true, orderNumber: true, status: true } },
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const openCount = await prisma.orderReport.count({
    where: { status: { in: [OrderReportStatus.OPEN, OrderReportStatus.IN_PROGRESS] } },
  });

  return NextResponse.json({ reports, openCount });
}

export const GET = withErrorHandling(getHandler);
