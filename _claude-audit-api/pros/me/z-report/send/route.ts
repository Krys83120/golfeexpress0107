import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { computeZReportRange, buildZReportData, type ZReportPeriod } from "@/lib/zReport";
import { buildZReportPdf } from "@/lib/pdf/zReport";
import { sendZReportEmail } from "@/lib/emails/documentEmails";

const VALID_PERIODS: ZReportPeriod[] = ["day", "week", "month"];

/**
 * POST /api/pros/me/z-report/send
 * Body: { period: "day"|"week"|"month", date?: "YYYY-MM-DD" }
 *
 * Envoie le rapport Z (PDF) par email au Pro connecté (emailContact de sa
 * fiche boutique, avec repli sur l'email de son compte).
 */
async function postHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);
  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (!pro) throw new ApiError(404, "Profil commerçant introuvable.");

  const body = await req.json().catch(() => ({}));
  const period: ZReportPeriod = VALID_PERIODS.includes(body?.period) ? body.period : "day";
  const anchorDateStr =
    typeof body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : new Date().toISOString().slice(0, 10);

  const range = computeZReportRange(anchorDateStr, period);
  const data = await buildZReportData(pro.id, pro.businessName, pro.siret, range);
  const pdf = await buildZReportPdf(data);

  const to = pro.emailContact || auth.email;
  await sendZReportEmail(to, range.label, pdf);

  return NextResponse.json({ sent: true, to });
}

export const POST = withErrorHandling(postHandler);
