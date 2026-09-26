import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { buildProspectingEmailHtml, sendProspectingEmail } from "@/lib/emails/prospectingEmails";

/**
 * POST /api/admin/prospects/[prospectId]/send-email
 *
 * Mail de prospection commerciale, déclenché manuellement par Krys depuis
 * la page Admin > Prospection (ajout du 26/09/2026) -- même principe que
 * /api/admin/pros/[proId]/premium-upsell : elle garde le contrôle total,
 * objet + accroche modifiables, jamais d'envoi groupé automatique.
 *
 * Body: { subject: string, introText: string, mode: "preview" | "test" | "send" }
 *  - "preview" : ne déclenche AUCUN envoi, renvoie juste le HTML pour
 *    affichage dans la modale ("configurable et testable" -- demande de
 *    Krys explicitement formulée ainsi, contrairement à la relance dossier
 *    incomplet qui elle est fixe/un clic).
 *  - "test"    : envoie à l'email de l'Admin connecté, pour vérifier le
 *    rendu réel en boîte mail avant l'envoi pour de vrai.
 *  - "send"    : envoi réel au prospect + enregistre
 *    prospectingEmailSentAt/prospectingEmailId. L'id Resend renvoyé est LA
 *    clé utilisée ensuite par le webhook Resend (voir
 *    app/api/webhooks/resend/route.ts) pour savoir si le mail a été ouvert
 *    et/ou cliqué.
 */
async function postHandler(req: NextRequest, ctx: { params: { prospectId: string } }) {
  const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
  const introText = typeof body?.introText === "string" ? body.introText.trim() : "";
  const mode = body?.mode;
  if (!subject || !introText) {
    throw new ApiError(400, "L'objet et le texte d'accroche sont requis.");
  }
  if (mode !== "preview" && mode !== "test" && mode !== "send") {
    throw new ApiError(400, "Mode invalide (attendu: preview, test ou send).");
  }

  const prospect = await prisma.prospect.findUnique({ where: { id: ctx.params.prospectId } });
  if (!prospect) {
    throw new ApiError(404, "Prospect introuvable.");
  }

  const emailData = { businessName: prospect.businessName, city: prospect.city, introText };

  if (mode === "preview") {
    const html = await buildProspectingEmailHtml(emailData);
    return NextResponse.json({ html });
  }

  if (mode === "test") {
    const admin = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!admin?.email) {
      throw new ApiError(400, "Impossible de retrouver votre email administrateur.");
    }
    await sendProspectingEmail(admin.email, `[TEST] ${subject}`, emailData);
    return NextResponse.json({ sent: true, to: admin.email });
  }

  // mode === "send"
  if (!prospect.email) {
    throw new ApiError(400, "Ce prospect n'a pas encore d'email renseigné — complétez-le avant d'envoyer.");
  }
  const { id: resendId } = await sendProspectingEmail(prospect.email, subject, emailData);
  const updated = await prisma.prospect.update({
    where: { id: prospect.id },
    data: {
      prospectingEmailSentAt: new Date(),
      prospectingEmailId: resendId,
      // Un nouvel envoi repart "propre" sur ouverture/clic -- évite qu'un
      // vieux clic (ex. sur un tout premier mail des mois plus tôt) reste
      // affiché comme s'il concernait ce nouvel envoi.
      prospectingEmailOpenedAt: null,
      prospectingEmailClickedAt: null,
    },
  });
  return NextResponse.json({ sent: true, sentAt: updated.prospectingEmailSentAt });
}

export const POST = withErrorHandling(postHandler);
