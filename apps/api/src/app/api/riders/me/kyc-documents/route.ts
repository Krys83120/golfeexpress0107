import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { signKycDocumentOrNull } from "@/lib/kycDocuments";

/**
 * GET /api/riders/me/kyc-documents
 *
 * Ajout du 02/10/2026 -- correctif sécurité/RGPD (voir lib/kycDocuments.ts).
 * Équivalent "self-service" de /api/admin/riders/[riderId]/kyc-documents :
 * permet au livreur connecté de revoir ses propres documents déjà envoyés
 * (aperçu dans RiderKycScreen.tsx à la réouverture de l'écran) sans jamais
 * exposer d'URL publique permanente -- juste une URL signée, valable 5
 * minutes, pour ses propres documents uniquement (jamais ceux d'un autre
 * livreur, scope limité à auth.userId).
 */
export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.RIDER]);

  const rider = await prisma.rider.findUnique({
    where: { userId: auth.userId },
    select: { idCardFront: true, idCardBack: true, verificationSelfieUrl: true },
  });
  if (!rider) {
    throw new ApiError(404, "Profil livreur introuvable.");
  }

  const [idCardFront, idCardBack, verificationSelfieUrl] = await Promise.all([
    signKycDocumentOrNull(rider.idCardFront),
    signKycDocumentOrNull(rider.idCardBack),
    signKycDocumentOrNull(rider.verificationSelfieUrl),
  ]);

  return NextResponse.json({ idCardFront, idCardBack, verificationSelfieUrl });
}

export const GET = withErrorHandling(getHandler);
