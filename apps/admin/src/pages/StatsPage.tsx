import React, { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { useAdminOrdersStore } from "@/store/useAdminOrdersStore";
import { computeBasketStats, type StatsPeriod } from "@/services/basketStats";
import { downloadCsv } from "@/services/csvExport";

const PERIOD_LABELS: Record<StatsPeriod, string> = { day: "Jour", week: "Semaine", month: "Mois" };

/**
 * Panier moyen par jour/semaine/mois, calculé côté client à partir des
 * commandes déjà chargées par useAdminOrdersStore (jusqu'à 1000 commandes
 * les plus récentes, voir GET /api/orders et ordersApi.ts) -- pas
 * d'endpoint dédié, ce volume suffit très largement pour ce calcul.
 */
export function StatsPage() {
  const orders = useAdminOrdersStore((s) => s.orders);
  const status = useAdminOrdersStore((s) => s.status);
  const loadOrders = useAdminOrdersStore((s) => s.loadOrders);
  const [period, setPeriod] = useState<StatsPeriod>("day");

  useEffect(() => {
    if (orders.length === 0) loadOrders();
  }, []);

  const stats = useMemo(() => computeBasketStats(orders, period), [orders, period]);

  const overall = useMemo(() => {
    const totalOrders = stats.reduce((sum, s) => sum + s.orderCount, 0);
    const totalRevenue = stats.reduce((sum, s) => sum + s.totalRevenue, 0);
    return { totalOrders, totalRevenue, averageBasket: totalOrders > 0 ? totalRevenue / totalOrders : 0 };
  }, [stats]);

  function handleExport() {
    const headers = ["Période", "Nombre de commandes livrées", "Chiffre d'affaires (€)", "Panier moyen (€)"];
    const rows = stats.map((s) => [s.label, s.orderCount, s.totalRevenue.toFixed(2), s.averageBasket.toFixed(2)]);
    downloadCsv(`panier-moyen-${period}-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  return (
    <div className="flex-1 p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-nuit">Statistiques</h1>
          <p className="text-sm text-gris">
            Panier moyen par jour, semaine ou mois -- calculé sur les commandes livrées, basé sur les {orders.length}{" "}
            commandes les plus récentes chargées.
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full bg-gris-light p-0.5">
          {(Object.keys(PERIOD_LABELS) as StatsPeriod[]).map((p) => (
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
        <button
          onClick={handleExport}
          disabled={stats.length === 0}
          className="flex items-center gap-1.5 rounded-sm border border-gris-light bg-white px-3 py-2 text-xs font-semibold text-nuit transition-colors hover:bg-gris-light disabled:opacity-50"
        >
          <Download size={14} />
          Exporter CSV
        </button>
      </div>

      {status === "loading" && orders.length === 0 ? (
        <p className="py-12 text-center text-sm text-gris">Chargement...</p>
      ) : stats.length === 0 ? (
        <div className="rounded-sm border border-dashed border-gris-light p-8 text-center text-sm text-gris">
          Aucune commande livrée sur la période disponible.
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-sm border border-gris-light bg-white p-4">
              <p className="text-xs text-gris">Commandes livrées</p>
              <p className="mt-1 text-2xl font-extrabold text-nuit">{overall.totalOrders}</p>
            </div>
            <div className="rounded-sm border border-gris-light bg-white p-4">
              <p className="text-xs text-gris">Chiffre d'affaires</p>
              <p className="mt-1 text-2xl font-extrabold text-nuit">{overall.totalRevenue.toFixed(2)} €</p>
            </div>
            <div className="rounded-sm border border-gris-light bg-white p-4">
              <p className="text-xs text-gris">Panier moyen</p>
              <p className="mt-1 text-2xl font-extrabold text-nuit">{overall.averageBasket.toFixed(2)} €</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-sm border border-gris-light bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gris-light bg-gris-light/40 text-left text-xs text-gris">
                  <th className="px-4 py-2.5 font-semibold">Période</th>
                  <th className="px-4 py-2.5 font-semibold">Commandes</th>
                  <th className="px-4 py-2.5 font-semibold">Chiffre d'affaires</th>
                  <th className="px-4 py-2.5 font-semibold">Panier moyen</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.key} className="border-b border-gris-light last:border-0">
                    <td className="px-4 py-2.5 font-medium capitalize text-nuit">{s.label}</td>
                    <td className="px-4 py-2.5 text-nuit">{s.orderCount}</td>
                    <td className="px-4 py-2.5 text-nuit">{s.totalRevenue.toFixed(2)} €</td>
                    <td className="px-4 py-2.5 font-semibold text-nuit">{s.averageBasket.toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
