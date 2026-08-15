import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { computeZReportRange, buildZReportData, type ZReportPeriod } from "@/lib/zReport";
import { buildZReportPdf } from "@/lib/pdf/zReport";

const VALID_PERIODS: ZReportPeriod[] = ["day", "week", "month"];

/**
 * GET /api/pros/me/z-report?period=day|week|month&date=YYYY-MM-DD
 *
 * Rapport Z (clôture de caisse) du Pro connecté, en PDF — `date` est le
 * jour de référence (défaut : aujourd'hui) ; pour "week"/"month", on
 * calcule la semaine/le mois qui le contient. Sert de justificatif
 * comptable téléchargeable pour la traçabilité/archivage du Pro.
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);
  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
  if (!pro) throw new ApiError(404, "Profil commerçant introuvable.");

  const periodParam = req.nextUrl.searchParams.get("period") ?? "day";
  if (!VALID_PERIODS.includes(periodParam as ZReportPeriod)) {
    throw new ApiError(400, "Période invalide (day, week ou month).");
  }
  const period = periodParam as ZReportPeriod;

  const dateParam = req.nextUrl.searchParams.get("date");
  const anchorDateStr = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : new Date().toISOString().slice(0, 10);

  const range = computeZReportRange(anchorDateStr, period);
  const data = await buildZReportData(pro.id, pro.businessName, pro.siret, range);
  const pdf = await buildZReportPdf(data);

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="rapport-z-${anchorDateStr}-${period}.pdf"`,
    },
  });
}

export const GET = withErrorHandling(getHandler);
