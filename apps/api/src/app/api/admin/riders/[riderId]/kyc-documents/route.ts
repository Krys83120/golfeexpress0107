import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { signKycDocumentOrNull } from "@/lib/kycDocuments";

/**
 * GET /api/admin/riders/[riderId]/kyc-documents
 *
 * Ajout du 02/10/2026 -- correctif sécurité/RGPD (voir lib/kycDocuments.ts
 * pour le détail du raisonnement). Remplace l'usage direct de
 * Rider.idCardFront/idCardBack/verificationSelfieUrl comme src d'image dans
 * RiderDetailModal.tsx côté Admin : génère à la demande des URLs signées,
 * valables 5 minutes, uniquement pour un Admin authentifié.
 *
 * Suppose que le bucket "kyc-documents" soit configuré en PRIVÉ côté
 * dashboard Supabase -- tant que ce n'est pas fait, les anciennes URLs
 * publiques stockées en base restent accessibles directement, cette route
 * seule ne suffit pas.
 */
export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest, ctx: { params: { riderId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const rider = await prisma.rider.findUnique({
    where: { id: ctx.params.riderId },
    select: { idCardFront: true, idCardBack: true, verificationSelfieUrl: true },
  });
  if (!rider) {
    throw new ApiError(404, "Livreur introuvable.");
  }

  const [idCardFront, idCardBack, verificationSelfieUrl] = await Promise.all([
    signKycDocumentOrNull(rider.idCardFront),
    signKycDocumentOrNull(rider.idCardBack),
    signKycDocumentOrNull(rider.verificationSelfieUrl),
  ]);

  return NextResponse.json({ idCardFront, idCardBack, verificationSelfieUrl });
}

export const GET = withErrorHandling(getHandler);
