import { NextRequest, NextResponse } from "next/server";
import { requireProOrEmployee, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { computeZReportRange, buildZReportData, type ZReportPeriod } from "@/lib/zReport";
import { buildZReportPdf } from "@/lib/pdf/zReport";

const VALID_PERIODS: ZReportPeriod[] = ["day", "week", "month"];

/**
 * GET /api/pros/me/z-report?period=day|week|month&date=YYYY-MM-DD
 *
 * Rapport Z (clôture de caisse) de la boutique connectée, en PDF — `date`
 * est le jour de référence (défaut : aujourd'hui) ; pour "week"/"month", on
 * calcule la semaine/le mois qui le contient. Sert de justificatif
 * comptable téléchargeable pour la traçabilité/archivage du Pro.
 *
 * Accessible au patron ET à un employé (voir requireProOrEmployee() dans
 * middleware/auth.ts) -- volontairement, contrairement au reste de
 * Finances (commissions détaillées, historique des versements Stripe...)
 * qui reste réservé au patron : faire le Z en fin de service est une tâche
 * opérationnelle normale pour l'équipe qui ferme la boutique, pas une
 * donnée financière sensible au même titre que le reste.
 */
async function getHandler(req: NextRequest) {
  const auth = await requireProOrEmployee(req);
  const pro = await prisma.pro.findUnique({ where: { id: auth.proId } });
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

  // Voir commentaire équivalent dans orders/[orderId]/receipt/route.ts —
  // Uint8Array est assignable à BodyInit, Buffer<ArrayBufferLike> ne l'est
  // pas structurellement selon les types de ce projet.
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="rapport-z-${anchorDateStr}-${period}.pdf"`,
    },
  });
}

export const GET = withErrorHandling(getHandler);
