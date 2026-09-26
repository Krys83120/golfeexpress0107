import { NextRequest, NextResponse } from "next/server";
import { UserRole, OrderReportStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/contact-messages
 *
 * Liste les messages envoyés via le widget "Nous contacter" du site
 * vitrine, pour la page admin "Messages" -- séparée de ReportsPage.tsx
 * (réclamations sur commande, rattachées à un compte) puisque ces messages
 * sont anonymes/sans commande associée. Filtre optionnel par statut (CSV),
 * réutilise OrderReportStatus (mêmes valeurs OPEN/IN_PROGRESS/RESOLVED/
 * REJECTED) pour partager la logique d'affichage côté admin.
 *
 * Query params optionnels: ?status=OPEN,IN_PROGRESS
 */
async function getHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const statusParam = req.nextUrl.searchParams.get("status");
  const where = statusParam
    ? { status: { in: statusParam.split(",") as OrderReportStatus[] } }
    : {};

  const messages = await prisma.contactMessage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const openCount = await prisma.contactMessage.count({
    where: { status: { in: [OrderReportStatus.OPEN, OrderReportStatus.IN_PROGRESS] } },
  });

  return NextResponse.json({ messages, openCount });
}

export const GET = withErrorHandling(getHandler);
