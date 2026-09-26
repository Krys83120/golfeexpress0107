import { NextRequest, NextResponse } from "next/server";
import { UserRole, OrderReportCategory } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { sendNewReportAdminAlert } from "@/lib/emails/reportEmails";

const MAX_MESSAGE_LENGTH = 2000;

/**
 * POST /api/reports
 *
 * Crée une réclamation (Client) ou un signalement de problème (Livreur,
 * Pro) rattaché à une commande. Un seul endpoint pour les 3 rôles -- voir
 * prisma/schema.prisma model OrderReport pour le raisonnement. Chaque rôle
 * ne peut signaler QUE sur une commande à laquelle il est réellement
 * rattaché (même vérification de propriété que GET /api/orders).
 *
 * Body: { orderId, category, message, photoUrl? }
 */
async function postHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.CLIENT, UserRole.RIDER, UserRole.PRO]);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    throw new ApiError(400, "Corps de requête invalide.");
  }
  const { orderId, category, message, photoUrl } = body as {
    orderId?: string;
    category?: string;
    message?: string;
    photoUrl?: string;
  };

  if (!orderId) {
    throw new ApiError(400, "orderId requis.");
  }
  if (!category || !Object.values(OrderReportCategory).includes(category as OrderReportCategory)) {
    throw new ApiError(400, "Catégorie invalide.");
  }
  if (!message || !message.trim()) {
    throw new ApiError(400, "Merci de décrire le problème.");
  }
  if (message.trim().length > MAX_MESSAGE_LENGTH) {
    throw new ApiError(400, `Message trop long (${MAX_MESSAGE_LENGTH} caractères maximum).`);
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new ApiError(404, "Commande introuvable.");
  }

  if (auth.role === UserRole.CLIENT) {
    const client = await prisma.client.findUnique({ where: { userId: auth.userId } });
    if (!client || order.clientId !== client.id) {
      throw new ApiError(403, "Cette commande ne vous appartient pas.");
    }
  } else if (auth.role === UserRole.RIDER) {
    const rider = await prisma.rider.findUnique({ where: { userId: auth.userId } });
    if (!rider || order.riderId !== rider.id) {
      throw new ApiError(403, "Cette commande ne vous est pas assignée.");
    }
  } else if (auth.role === UserRole.PRO) {
    const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
    if (!pro || order.proId !== pro.id) {
      throw new ApiError(403, "Cette commande n'appartient pas à votre boutique.");
    }
  }

  const reporter = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { firstName: true, lastName: true },
  });

  const report = await prisma.orderReport.create({
    data: {
      orderId: order.id,
      userId: auth.userId,
      reporterRole: auth.role,
      category: category as OrderReportCategory,
      message: message.trim(),
      photoUrl: photoUrl || undefined,
    },
  });

  // Best-effort : l'alerte email ne doit jamais faire échouer la création
  // de la réclamation elle-même (voir sendEmail dans shared.ts).
  await sendNewReportAdminAlert({
    reportId: report.id,
    orderNumber: order.orderNumber,
    reporterRole: auth.role,
    reporterName: reporter ? `${reporter.firstName} ${reporter.lastName}` : auth.email,
    category: report.category,
    message: report.message,
  });

  return NextResponse.json({ report }, { status: 201 });
}

/**
 * GET /api/reports
 *
 * Liste les réclamations/signalements créés par l'utilisateur connecté
 * (Client, Livreur ou Pro) -- utilisé pour afficher l'historique et le
 * statut/réponse admin dans chaque app.
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.CLIENT, UserRole.RIDER, UserRole.PRO]);

  const reports = await prisma.orderReport.findMany({
    where: { userId: auth.userId },
    include: { order: { select: { orderNumber: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ reports });
}

export const POST = withErrorHandling(postHandler);
export const GET = withErrorHandling(getHandler);
