import { NextRequest, NextResponse } from "next/server";
import { UserRole, SubscriptionType } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { findPack } from "@/lib/partnerPacks";
import { buildPremiumUpsellEmailHtml, sendPremiumUpsellEmail } from "@/lib/emails/subscriptionEmails";

async function postHandler(req: NextRequest, ctx: { params: { proId: string } }) {
  const auth = await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const body = await req.json().catch(() => null);
  const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
  const introText = typeof body?.introText === "string" ? body.introText.trim() : "";
  const mode = body?.mode;
  if (!subject || !introText) throw new ApiError(400, "L'objet et le texte d'accroche sont requis.");
  if (mode !== "preview" && mode !== "test" && mode !== "send") throw new ApiError(400, "Mode invalide (attendu: preview, test ou send).");

  const pro = await prisma.pro.findUnique({ where: { id: ctx.params.proId } });
  if (!pro) throw new ApiError(404, "Commerçant introuvable.");

  const [premiumPack, premiumPlusPack] = await Promise.all([
    findPack(SubscriptionType.PREMIUM),
    findPack(SubscriptionType.PREMIUM_PLUS),
  ]);
  if (!premiumPack || !premiumPlusPack) throw new ApiError(500, "Configuration des packs Premium/Premium+ introuvable.");

  const emailData = {
    businessName: pro.businessName,
    introText,
    currentCommissionRate: Number(pro.commissionRate),
    premiumPack,
    premiumPlusPack,
  };

  if (mode === "preview") {
    // buildPremiumUpsellEmailHtml est asynchrone depuis le 25/09/2026 --
    // emailShell() va chercher le logo du site vitrine (GlobalSetting
    // "branding.www_logo_url") pour l'en-tête du mail, au lieu de l'emoji
    // 🦎 fixe utilisé jusqu'ici. Voir shared.ts.
    const html = await buildPremiumUpsellEmailHtml(emailData);
    return NextResponse.json({ html });
  }
  if (mode === "test") {
    const admin = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!admin?.email) throw new ApiError(400, "Impossible de retrouver votre email administrateur.");
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
