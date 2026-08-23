import { NextRequest, NextResponse } from "next/server";
import { UserRole, AppSource } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

type Period = "day" | "week" | "month";

const APP_SOURCES: AppSource[] = [AppSource.WWW, AppSource.CLIENT, AppSource.PRO, AppSource.LIVREUR];
const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

/** Nombre de buckets et de jours de recul associés à chaque période -- mêmes ordres de grandeur que StatsPage (panier moyen) côté admin, pour rester cohérent. */
const PERIOD_CONFIG: Record<Period, { buckets: number; lookbackDays: number }> = {
  day: { buckets: 14, lookbackDays: 14 },
  week: { buckets: 8, lookbackDays: 8 * 7 },
  month: { buckets: 6, lookbackDays: 6 * 31 },
};

function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Construit la liste ordonnée des N derniers buckets (clé + libellé affiché) pour la période donnée, en partant d'aujourd'hui. */
function buildBucketList(period: Period, count: number): { key: string; label: string }[] {
  const buckets: { key: string; label: string }[] = [];
  const today = new Date();

  if (period === "day") {
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      buckets.push({ key: dayKey(d), label: DAY_LABELS[d.getDay()] });
    }
  } else if (period === "week") {
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i * 7);
      const key = isoWeekKey(d);
      buckets.push({ key, label: key.split("-W")[1] ? `S${key.split("-W")[1]}` : key });
    }
  } else {
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = monthKey(d);
      buckets.push({ key, label: d.toLocaleDateString("fr-FR", { month: "short" }) });
    }
  }
  return buckets;
}

function bucketKeyForDate(period: Period, date: Date): string {
  if (period === "day") return dayKey(date);
  if (period === "week") return isoWeekKey(date);
  return monthKey(date);
}

/**
 * GET /api/admin/analytics/visits?period=day|week|month (ADMIN/SUPER_ADMIN
 * uniquement)
 *
 * Agrège la table AppVisit côté SERVEUR (contrairement à basketStats.ts qui
 * agrège côté client) -- le volume d'événements de visite peut devenir bien
 * plus important que le volume de commandes, on évite donc de renvoyer les
 * lignes brutes au navigateur. Renvoie : le total de visites par app sur la
 * fenêtre (COUNT DISTINCT sessionId, voir model AppVisit -- "par session"),
 * une tendance par bucket (jour/semaine/mois) pour le graphique, les pages
 * les plus visitées (WWW uniquement, seule app multi-pages), et une
 * répartition mobile/desktop par app.
 */
async function getHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const periodParam = req.nextUrl.searchParams.get("period");
  const period: Period = periodParam === "week" || periodParam === "month" ? periodParam : "day";
  const config = PERIOD_CONFIG[period];

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - config.lookbackDays);

  const visits = await prisma.appVisit.findMany({
    where: { createdAt: { gte: windowStart } },
    select: { app: true, sessionId: true, path: true, deviceType: true, createdAt: true },
    orderBy: { createdAt: "asc" },
    // Filet de sécurité : au-delà de ce volume sur la fenêtre, un job
    // d'agrégation périodique deviendrait nécessaire plutôt qu'un calcul à
    // la volée -- largement suffisant tant que le trafic reste modeste.
    take: 200000,
  });

  // --- Totaux par app (visites distinctes sur toute la fenêtre) ---
  const sessionsByApp = new Map<AppSource, Set<string>>(APP_SOURCES.map((a) => [a, new Set<string>()]));
  for (const v of visits) {
    sessionsByApp.get(v.app as AppSource)?.add(v.sessionId);
  }
  const totalsByApp = Object.fromEntries(
    APP_SOURCES.map((a) => [a, sessionsByApp.get(a)?.size ?? 0])
  ) as Record<AppSource, number>;

  // --- Tendance par bucket (visites distinctes par app et par bucket) ---
  const bucketList = buildBucketList(period, config.buckets);
  const bucketSessions = new Map<string, Map<AppSource, Set<string>>>(
    bucketList.map((b) => [b.key, new Map(APP_SOURCES.map((a) => [a, new Set<string>()]))])
  );
  for (const v of visits) {
    const key = bucketKeyForDate(period, v.createdAt);
    const bucket = bucketSessions.get(key);
    if (!bucket) continue; // en dehors de la liste de buckets affichés (ne devrait pas arriver vu windowStart)
    bucket.get(v.app as AppSource)?.add(v.sessionId);
  }
  const trend = bucketList.map((b) => {
    const bucket = bucketSessions.get(b.key)!;
    const row: Record<string, string | number> = { label: b.label };
    for (const a of APP_SOURCES) row[a] = bucket.get(a)?.size ?? 0;
    return row;
  });

  // --- Pages les plus visitées (WWW uniquement -- seule app multi-pages) ---
  const pageCounts = new Map<string, number>();
  for (const v of visits) {
    if (v.app !== AppSource.WWW || !v.path) continue;
    pageCounts.set(v.path, (pageCounts.get(v.path) ?? 0) + 1);
  }
  const topPages = Array.from(pageCounts.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // --- Répartition mobile/desktop par app (sur les sessions distinctes) ---
  const deviceSeen = new Map<AppSource, Map<string, string>>(APP_SOURCES.map((a) => [a, new Map()]));
  for (const v of visits) {
    const perApp = deviceSeen.get(v.app as AppSource);
    if (perApp && !perApp.has(v.sessionId)) {
      perApp.set(v.sessionId, v.deviceType ?? "unknown");
    }
  }
  const deviceBreakdown = Object.fromEntries(
    APP_SOURCES.map((a) => {
      const counts = { mobile: 0, desktop: 0, unknown: 0 };
      for (const deviceType of deviceSeen.get(a)?.values() ?? []) {
        if (deviceType === "mobile") counts.mobile += 1;
        else if (deviceType === "desktop") counts.desktop += 1;
        else counts.unknown += 1;
      }
      return [a, counts];
    })
  ) as Record<AppSource, { mobile: number; desktop: number; unknown: number }>;

  return NextResponse.json({
    period,
    windowDays: config.lookbackDays,
    totalsByApp,
    trend,
    topPages,
    deviceBreakdown,
  });
}

export const GET = withErrorHandling(getHandler);
