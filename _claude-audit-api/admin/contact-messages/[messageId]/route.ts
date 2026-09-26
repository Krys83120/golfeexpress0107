import { NextRequest, NextResponse } from "next/server";
import { UserRole, OrderReportStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { sendContactMessageRepliedEmail } from "@/lib/emails/contactEmails";

/**
 * PATCH /api/admin/contact-messages/[messageId]
 *
 * Permet à l'admin de changer le statut d'un message "Nous contacter"
 * et/ou d'y répondre directement depuis son compte -- la réponse part par
 * email au visiteur, l'admin n'a jamais besoin d'ouvrir sa propre
 * messagerie (voir sendContactMessageRepliedEmail). Un email n'est envoyé
 * que si `adminReply` est fourni, même logique que
 * /api/admin/reports/[reportId].
 *
 * Body: { status?, adminReply? }
 */
async function patchHandler(req: NextRequest, { params }: { params: { messageId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    throw new ApiError(400, "Corps de requête invalide.");
  }
  const { status, adminReply } = body as { status?: string; adminReply?: string };

  if (status && !Object.values(OrderReportStatus).includes(status as OrderReportStatus)) {
    throw new ApiError(400, "Statut invalide.");
  }

  const existing = await prisma.contactMessage.findUnique({ where: { id: params.messageId } });
  if (!existing) {
    throw new ApiError(404, "Message introuvable.");
  }

  const trimmedReply = adminReply?.trim();

  const contactMessage = await prisma.contactMessage.update({
    where: { id: params.messageId },
    data: {
      status: (status as OrderReportStatus) ?? undefined,
      adminReply: trimmedReply ? trimmedReply : undefined,
      repliedAt: trimmedReply ? new Date() : undefined,
    },
  });

  if (trimmedReply) {
    await sendContactMessageRepliedEmail(existing.email, {
      subject: existing.subject,
      adminReply: trimmedReply,
      repliedAt: contactMessage.repliedAt!.toISOString(),
    });
  }

  return NextResponse.json({ message: contactMessage });
}

export const PATCH = withErrorHandling(patchHandler);
