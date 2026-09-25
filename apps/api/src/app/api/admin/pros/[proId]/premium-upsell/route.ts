import { NextRequest, NextResponse } from "next/server";
import { UserRole, SubscriptionType } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { findPack } from "@/lib/partnerPacks";
import { buildPremiumUpsellEmailHtml, sendPremiumUpsellEmail } from "@/lib/emails/subscriptionEmails";

/**
 * POST /api/admin/pros/[proId]/premium-upsell
 *
 * Mail d'incitation à passer sur un pack payant (Premium/Premium+), déclenché
 * manuellement par un Admin depuis la fiche d'un commerçant (ajout du
 * 25/09/2026, demande de Krys). Un seul bouton par commerçant (jamais
 * d'envoi groupé) -- Krys garde le contrôle total de qui est relancé et
 * quand.
 *
 * Body: { subject: string, introText: string, mode: "preview" | "test" | "send" }
 *  - "preview" : ne déclenche AUCUN envoi, renvoie juste le HTML pour
 *    affichage côté admin (bouton "Aperçu").
 *  - "test"    : envoie le mail à l'email de l'Admin connecté (pas à celui
 *    du commerçant) pour vérifier le rendu réel en boîte mail avant un
 *    envoi pour de vrai.
 *  - "send"    : envoi réel au commerçant (pro.emailContact) + enregistre
 *    Pro.lastPremiumUpsellEmailAt pour affichage ("Dernier mail envoyé le
 *    JJ/MM") et éviter de relancer deux fois sans s'en rendre compte.
 *
 * L'objet et le texte d'accroche sont fournis par l'Admin (modifiables
 * avant envoi) -- tout le reste du mail (comparatif des packs, bouton,
 * mise en forme) est généré ici à partir de la config LIVE des packs
 * (findPack), jamais codé en dur, pour ne jamais afficher un prix ou une
 * commission périmés si Krys ajuste la tarification.
 */
async function postHandler(req: NextRequest, ctx: { params: { proId: string } }) {
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

  const pro = await prisma.pro.findUnique({ where: { id: ctx.params.proId } });
  if (!pro) {
    throw new ApiError(404, "Commerçant introuvable.");
  }

  const [premiumPack, premiumPlusPack] = await Promise.all([
    findPack(SubscriptionType.PREMIUM),
    findPack(SubscriptionType.PREMIUM_PLUS),
  ]);
  if (!premiumPack || !premiumPlusPack) {
    throw new ApiError(500, "Configuration des packs Premium/Premium+ introuvable.");
  }

  const emailData = {
    businessName: pro.businessName,
    introText,
    currentCommissionRate: Number(pro.commissionRate),
    premiumPack,
    premiumPlusPack,
  };

  if (mode === "preview") {
    const html = buildPremiumUpsellEmailHtml(emailData);
    return NextResponse.json({ html });
  }

  if (mode === "test") {
    const admin = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!admin?.email) {
      throw new ApiError(400, "Impossible de retrouver votre email administrateur.");
    }
    await sendPremiumUpsellEmail(admin.email, `[TEST] ${subject}`, emailData);
    return NextResponse.json({ sent: true, to: admin.email });
  }

  // mode === "send"
  await sendPremiumUpsellEmail(pro.emailContact, subject, emailData);
  const updated = await prisma.pro.update({
    where: { id: pro.id },
    data: { lastPremiumUpsellEmailAt: new Date() },
  });
  return NextResponse.json({ sent: true, sentAt: updated.lastPremiumUpsellEmailAt });
}

export const POST = withErrorHandling(postHandler);
