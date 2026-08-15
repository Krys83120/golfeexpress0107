import { prisma } from "@/lib/prisma";
import { PaymentStatus, OrderStatus } from "@golfeexpress/types";

export type ZReportPeriod = "day" | "week" | "month";

const PARIS_TZ = "Europe/Paris";

/**
 * Décalage Europe/Paris (en minutes) au moment `instant` — gère
 * automatiquement CET/CEST (+1h/+2h) sans dépendance externe (date-fns-tz,
 * luxon...). Suffisant pour un rapport Z (précision à la minute), pas
 * garanti à la seconde près pile au moment d'un changement d'heure.
 */
function getParisOffsetMinutes(instant: Date): number {
  const asUtc = new Date(instant.toLocaleString("en-US", { timeZone: "UTC" }));
  const asParis = new Date(instant.toLocaleString("en-US", { timeZone: PARIS_TZ }));
  return Math.round((asParis.getTime() - asUtc.getTime()) / 60000);
}

/** Instant UTC correspondant à minuit heure de Paris pour la date civile "YYYY-MM-DD" donnée. */
function parisMidnightUtc(dateStr: string): Date {
  const naiveUtcMidnight = new Date(`${dateStr}T00:00:00Z`);
  const offsetMin = getParisOffsetMinutes(naiveUtcMidnight);
  return new Date(naiveUtcMidnight.getTime() - offsetMin * 60000);
}

/** Jour civil ("YYYY-MM-DD") d'un instant, dans le fuseau Europe/Paris. */
function parisDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: PARIS_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateFr(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export interface ZReportRange {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Calcule les bornes [start, end) d'une période, ancrée sur `anchorDateStr`
 * ("YYYY-MM-DD", jour choisi par le Pro) — la semaine va du lundi au
 * dimanche (convention française), le mois du 1er au dernier jour.
 */
export function computeZReportRange(anchorDateStr: string, period: ZReportPeriod): ZReportRange {
  if (period === "day") {
    return {
      start: parisMidnightUtc(anchorDateStr),
      end: parisMidnightUtc(addDays(anchorDateStr, 1)),
      label: formatDateFr(anchorDateStr),
    };
  }

  if (period === "week") {
    const dow = new Date(`${anchorDateStr}T00:00:00Z`).getUTCDay(); // 0=dim...6=sam
    const diffToMonday = dow === 0 ? -6 : 1 - dow;
    const mondayStr = addDays(anchorDateStr, diffToMonday);
    const sundayStr = addDays(mondayStr, 6);
    return {
      start: parisMidnightUtc(mondayStr),
      end: parisMidnightUtc(addDays(mondayStr, 7)),
      label: `Semaine du ${formatDateFr(mondayStr)} au ${formatDateFr(sundayStr)}`,
    };
  }

  // month
  const [y, m] = anchorDateStr.split("-");
  const monthStartStr = `${y}-${m}-01`;
  const nextMonthDate = new Date(`${monthStartStr}T00:00:00Z`);
  nextMonthDate.setUTCMonth(nextMonthDate.getUTCMonth() + 1);
  const nextMonthStr = nextMonthDate.toISOString().slice(0, 10);
  return {
    start: parisMidnightUtc(monthStartStr),
    end: parisMidnightUtc(nextMonthStr),
    label: new Date(`${monthStartStr}T00:00:00Z`).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
  };
}

export interface ZReportDailyEntry {
  dateLabel: string;
  orderCount: number;
  grossAmount: number;
}

export interface ZReportData {
  range: ZReportRange;
  proBusinessName: string;
  proSiret?: string | null;
  orderCount: number;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  refundedCount: number;
  refundedAmount: number;
  cancelledCount: number;
  dailyBreakdown: ZReportDailyEntry[];
}

/**
 * Agrège les commandes d'un Pro sur la période — base d'un "rapport Z"
 * façon caisse enregistreuse, utilisé comme justificatif comptable
 * (traçabilité/archives). Seules les commandes réellement encaissées
 * (paymentStatus CAPTURED, non annulées) entrent dans le chiffre encaissé
 * net ; les remboursements et annulations sont comptés à part, pour
 * transparence, mais exclus du total.
 */
export async function buildZReportData(
  proId: string,
  proBusinessName: string,
  proSiret: string | null,
  range: ZReportRange
): Promise<ZReportData> {
  const orders = await prisma.order.findMany({
    where: { proId, placedAt: { gte: range.start, lt: range.end } },
    select: {
      placedAt: true,
      paymentStatus: true,
      status: true,
      total: true,
      platformEarnings: true,
      proEarnings: true,
    },
  });

  const captured = orders.filter((o) => o.paymentStatus === PaymentStatus.CAPTURED && o.status !== OrderStatus.CANCELLED);
  const refunded = orders.filter((o) => o.paymentStatus === PaymentStatus.REFUNDED);
  const cancelled = orders.filter((o) => o.status === OrderStatus.CANCELLED);

  const grossAmount = captured.reduce((sum, o) => sum + Number(o.total), 0);
  const commissionAmount = captured.reduce((sum, o) => sum + Number(o.platformEarnings), 0);
  const netAmount = captured.reduce((sum, o) => sum + Number(o.proEarnings), 0);
  const refundedAmount = refunded.reduce((sum, o) => sum + Number(o.total), 0);

  const byDay = new Map<string, { orderCount: number; grossAmount: number }>();
  for (const o of captured) {
    const key = parisDayKey(o.placedAt);
    const entry = byDay.get(key) ?? { orderCount: 0, grossAmount: 0 };
    entry.orderCount += 1;
    entry.grossAmount += Number(o.total);
    byDay.set(key, entry);
  }
  const dailyBreakdown: ZReportDailyEntry[] = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, v]) => ({ dateLabel: formatDateFr(dateKey), orderCount: v.orderCount, grossAmount: v.grossAmount }));

  return {
    range,
    proBusinessName,
    proSiret,
    orderCount: captured.length,
    grossAmount,
    commissionAmount,
    netAmount,
    refundedCount: refunded.length,
    refundedAmount,
    cancelledCount: cancelled.length,
    dailyBreakdown,
  };
}
