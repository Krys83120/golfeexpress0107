import { NextRequest, NextResponse } from "next/server";
import { UserRole, ProStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { sendProDossierIncompleteReminderEmail } from "@/lib/emails/accountEmails";

/**
 * POST /api/admin/pros/[proId]/dossier-reminder (ajout du 26/09/2026,
 * demande de Krys) -- relance manuelle par email d'un Pro inscrit dont le
 * dossier n'a jamais été complété (SIRET encore au format "PENDING-xxx"
 * et/ou Kbis jamais uploadé, voir auth/signup/route.ts : ces champs sont
 * créés avec des valeurs provisoires à l'inscription, à compléter ensuite
 * via PATCH /api/pros/me) et qui reste donc indéfiniment PENDING, invisible
 * pour les clients et incapable de recevoir la moindre commande.
 *
 * Deux garde-fous avant l'envoi : le compte doit toujours être PENDING (pas
 * déjà validé/rejeté entre-temps), et le dossier doit être RÉELLEMENT
 * incomplet -- sinon ce n'est pas ce bouton qu'il faut utiliser mais
 * Approuver/Rejeter depuis Validations KYC. Même logique de détection que
 * isProDossierIncomplete côté admin (apps/admin/src/services/validationsApi.ts)
 * -- à garder synchronisées si l'un des deux critères change un jour.
 */
async function postHandler(req: NextRequest, ctx: { params: { proId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const pro = await prisma.pro.findUnique({ where: { id: ctx.params.proId } });
  if (!pro) throw new ApiError(404, "Commerçant introuvable.");
  if (pro.status !== ProStatus.PENDING) {
    throw new ApiError(400, "Ce compte n'est plus en attente de validation.");
  }
  const isIncomplete = pro.siret.startsWith("PENDING-") || !pro.kbisUrl;
  if (!isIncomplete) {
    throw new ApiError(400, "Le dossier est déjà complet — utilisez Approuver/Rejeter depuis Validations KYC.");
  }

  await sendProDossierIncompleteReminderEmail(pro.emailContact, pro.businessName);
  const updated = await prisma.pro.update({
    where: { id: pro.id },
    data: { lastDossierReminderAt: new Date() },
  });
  return NextResponse.json({ sent: true, sentAt: updated.lastDossierReminderAt });
}

export const POST = withErrorHandling(postHandler);
