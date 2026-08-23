import React, { useEffect, useState } from "react";
import { Download, Smartphone, Monitor } from "lucide-react";
import { fetchVisitStats, type VisitPeriod, type VisitStats } from "@/services/visitsApi";
import { APP_SOURCE_LABELS, APP_SOURCE_ORDER } from "@/services/appSourceLabels";
import { downloadCsv } from "@/services/csvExport";
import { VisitsTrendChart } from "@/components/VisitsTrendChart";

const PERIOD_LABELS: Record<VisitPeriod, string> = { day: "Jour", week: "Semaine", month: "Mois" };

/**
 * Statistiques de fréquentation des 4 apps (site vitrine, Client, Pro,
 * Livreur) -- entièrement anonyme (voir prisma/schema.prisma model
 * AppVisit et POST /api/analytics/visit) : compteurs uniquement (app, page,
 * date, device), jamais lié à un compte. "Visite" = une session (une
 * ouverture d'app/du site), voir GET /api/admin/analytics/visits pour le
 * détail de l'agrégation, calculée côté serveur.
 */
export function VisitsPage() {
  const [period, setPeriod] = useState<VisitPeriod>("day");
  const [stats, setStats] = useState<VisitStats | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetchVisitStats(period)
      .then((data) => {
        if (cancelled) return;
        setStats(data);
        setStatus("idle");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  function handleExportTrend() {
    if (!stats) return;
    const headers = ["Période", ...APP_SOURCE_ORDER.map((a) => APP_SOURCE_LABELS[a].label)];
    const rows = stats.trend.map((p) => [p.label, ...APP_SOURCE_ORDER.map((a) => p[a])]);
    downloadCsv(`visites-tendance-${period}-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  function handleExportTopPages() {
    if (!stats) return;
    const headers = ["Page", "Vues"];
    const rows = stats.topPages.map((p) => [p.path, p.count]);
    downloadCsv(`visites-pages-populaires-${period}-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  return (
    <div className="flex-1 p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-nuit">Visites</h1>
          <p className="text-sm text-gris">
            Fréquentation du site vitrine, de l'app Client, de l'app Pro et de l'app Livreur -- données anonymes
            uniquement (aucun compte n'est identifié).
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-gris-light p-0.5">
          {(Object.keys(PERIOD_LABELS) as VisitPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={
                "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors " +
                (period === p ? "bg-white text-nuit shadow-sm" : "text-gris")
              }
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        {stats && (
          <p className="text-xs text-gris">Sur les {stats.windowDays} derniers jours.</p>
        )}
      </div>

      {status === "loading" && !stats ? (
        <p className="py-12 text-center text-sm text-gris">Chargement...</p>
      ) : status === "error" ? (
        <div className="rounded-sm border border-dashed border-gris-light p-8 text-center text-sm text-gris">
          Impossible de charger les statistiques de visites.
        </div>
      ) : stats ? (
        <>
          <div className="mb-6 grid grid-cols-4 gap-4">
            {APP_SOURCE_ORDER.map((app) => {
              const info = APP_SOURCE_LABELS[app];
              const devices = stats.deviceBreakdown[app];
              const totalDevices = devices.mobile + devices.desktop + devices.unknown;
              const mobilePct = totalDevices > 0 ? Math.round((devices.mobile / totalDevices) * 100) : 0;
              return (
                <div key={app} className="rounded-sm border border-gris-light bg-white p-4">
                  <p className="text-xs text-gris">
                    {info.emoji} {info.label}
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-nuit">{stats.totalsByApp[app]}</p>
                  <p className="mt-1 text-[11px] text-gris">visites sur la période</p>
                  {totalDevices > 0 && (
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-gris">
                      <span className="flex items-center gap-1">
                        <Smartphone size={12} /> {mobilePct}%
                      </span>
                      <span className="flex items-center gap-1">
                        <Monitor size={12} /> {100 - mobilePct}%
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-heading text-base font-bold text-nuit">Tendance</h2>
            <button
              onClick={handleExportTrend}
              disabled={stats.trend.length === 0}
              className="flex items-center gap-1.5 rounded-sm border border-gris-light bg-white px-3 py-2 text-xs font-semibold text-nuit transition-colors hover:bg-gris-light disabled:opacity-50"
            >
              <Download size={14} />
              Exporter CSV
            </button>
          </div>
          <div className="mb-8">
            <VisitsTrendChart data={stats.trend} />
          </div>

          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-base font-bold text-nuit">Pages les plus visitées (site vitrine)</h2>
            <button
              onClick={handleExportTopPages}
              disabled={stats.topPages.length === 0}
              className="flex items-center gap-1.5 rounded-sm border border-gris-light bg-white px-3 py-2 text-xs font-semibold text-nuit transition-colors hover:bg-gris-light disabled:opacity-50"
            >
              <Download size={14} />
              Exporter CSV
            </button>
          </div>
          {stats.topPages.length === 0 ? (
            <div className="rounded-sm border border-dashed border-gris-light p-8 text-center text-sm text-gris">
              Aucune page vue sur le site vitrine sur la période.
            </div>
          ) : (
            <div className="overflow-hidden rounded-sm border border-gris-light bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gris-light bg-gris-light/40 text-left text-xs text-gris">
                    <th className="px-4 py-2.5 font-semibold">Page</th>
                    <th className="px-4 py-2.5 font-semibold">Vues</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topPages.map((p) => (
                    <tr key={p.path} className="border-b border-gris-light last:border-0">
                      <td className="px-4 py-2.5 font-medium text-nuit">{p.path}</td>
                      <td className="px-4 py-2.5 text-nuit">{p.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
