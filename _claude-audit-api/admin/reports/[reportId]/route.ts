import { NextRequest, NextResponse } from "next/server";
import { UserRole, OrderReportStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { sendReportRepliedEmail } from "@/lib/emails/reportEmails";

/**
 * PATCH /api/admin/reports/[reportId]
 *
 * Permet à l'admin de changer le statut d'une réclamation et/ou d'y
 * répondre directement depuis le compte admin (voir ReportsPage.tsx). Un
 * email est envoyé à l'auteur (Client/Livreur/Pro) uniquement si une
 * réponse (`adminReply`) est fournie -- un simple changement de statut sans
 * message n'envoie rien, pour ne pas spammer sur les statuts intermédiaires
 * (ex: OPEN -> IN_PROGRESS pris en charge sans réponse écrite pour l'instant).
 *
 * Body: { status?, adminReply? }
 */
async function patchHandler(req: NextRequest, { params }: { params: { reportId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    throw new ApiError(400, "Corps de requête invalide.");
  }
  const { status, adminReply } = body as { status?: string; adminReply?: string };

  if (status && !Object.values(OrderReportStatus).includes(status as OrderReportStatus)) {
    throw new ApiError(400, "Statut invalide.");
  }

  const existing = await prisma.orderReport.findUnique({
    where: { id: params.reportId },
    include: { order: { select: { orderNumber: true } }, user: { select: { email: true } } },
  });
  if (!existing) {
    throw new ApiError(404, "Réclamation introuvable.");
  }

  const trimmedReply = adminReply?.trim();

  const report = await prisma.orderReport.update({
    where: { id: params.reportId },
    data: {
      status: (status as OrderReportStatus) ?? undefined,
      adminReply: trimmedReply ? trimmedReply : undefined,
      repliedAt: trimmedReply ? new Date() : undefined,
    },
    include: {
      order: { select: { id: true, orderNumber: true, status: true } },
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true } },
    },
  });

  if (trimmedReply) {
    await sendReportRepliedEmail(existing.user.email, {
      orderNumber: existing.order.orderNumber,
      category: report.category,
      adminReply: trimmedReply,
      repliedAt: report.repliedAt!.toISOString(),
    });
  }

  return NextResponse.json({ report });
}

export const PATCH = withErrorHandling(patchHandler);
