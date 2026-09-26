import { NextRequest, NextResponse } from "next/server";
import { UserRole, RiderStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { sendRiderDossierIncompleteReminderEmail } from "@/lib/emails/accountEmails";

/**
 * POST /api/admin/riders/[riderId]/dossier-reminder -- équivalent Livreur
 * de pros/[proId]/dossier-reminder, voir ce fichier pour le contexte
 * complet. Dossier incomplet ici = pièce d'identité (recto/verso) et/ou
 * IBAN encore vides (voir auth/signup/route.ts : idCardFront/idCardBack/iban
 * créés à "" à l'inscription, à compléter ensuite via PATCH /api/riders/me).
 *
 * Mêmes garde-fous que côté Pro : compte toujours PENDING + dossier
 * réellement incomplet, sinon 400 (voir isRiderDossierIncomplete côté
 * admin, apps/admin/src/services/validationsApi.ts).
 */
async function postHandler(req: NextRequest, ctx: { params: { riderId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const rider = await prisma.rider.findUnique({
    where: { id: ctx.params.riderId },
    include: { user: { select: { email: true, firstName: true } } },
  });
  if (!rider) throw new ApiError(404, "Livreur introuvable.");
  if (rider.status !== RiderStatus.PENDING) {
    throw new ApiError(400, "Ce compte n'est plus en attente de validation.");
  }
  const isIncomplete = !rider.idCardFront || !rider.idCardBack || !rider.iban;
  if (!isIncomplete) {
    throw new ApiError(400, "Le dossier est déjà complet — utilisez Approuver/Rejeter depuis Validations KYC.");
  }

  await sendRiderDossierIncompleteReminderEmail(rider.user.email, rider.user.firstName);
  const updated = await prisma.rider.update({
    where: { id: rider.id },
    data: { lastDossierReminderAt: new Date() },
  });
  return NextResponse.json({ sent: true, sentAt: updated.lastDossierReminderAt });
}

export const POST = withErrorHandling(postHandler);
