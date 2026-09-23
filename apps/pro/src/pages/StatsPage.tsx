import React, { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { fetchMyStats, exportMyStats, type StatsPeriod, type StatsResponse } from "@/services/statsApi";

const PERIOD_LABELS: Record<Exclude<StatsPeriod, "custom">, string> = {
  today: "24h",
  week: "Semaine",
  month: "Mois",
  year: "Année",
  all: "Tout",
};

const PRESET_PERIODS = Object.keys(PERIOD_LABELS) as Array<Exclude<StatsPeriod, "custom">>;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Onglet Statistiques (23/09/2026, demande explicite de Krys) -- bilan des
 * ventes par produit sur une période choisie (24h/semaine/mois/année/tout
 * l'historique), avec export CSV. Plage de dates personnalisée ajoutée le
 * 23/09/2026 (retour de Krys : "il faut que l'on puisse voir la date, les
 * semaine le mois, et que l'on puisse exporter avec une plage de date") --
 * pilote à la fois l'écran (3 chiffres + classement produits) ET l'export
 * CSV, en plus des périodes glissantes existantes. Voir GET
 * /api/pros/me/stats côté serveur pour le détail de pourquoi cet écran ne
 * réutilise pas l'agrégation client-side du Dashboard
 * (useProOrdersStore.orders, capé à 50 commandes).
 */
export function StatsPage() {
  const [period, setPeriod] = useState<StatsPeriod>("week");
  const [data, setData] = useState<StatsResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Plage personnalisée : `draftFrom`/`draftTo` sont liés aux <input
  // type="date"> (modifiables librement pendant la saisie) ; `customFrom`/
  // `customTo` ne sont mis à jour qu'au clic sur "Appliquer", et c'est ce
  // couple-là qui déclenche réellement le fetch -- sinon chaque frappe dans
  // le champ relancerait un appel réseau avec une date incomplète.
  const [showCustomPanel, setShowCustomPanel] = useState(false);
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const customRangeInvalid = Boolean(draftFrom && draftTo && draftFrom > draftTo);

  useEffect(() => {
    if (period === "custom" && (!customFrom || !customTo)) return;
    setStatus("loading");
    const range = period === "custom" ? { from: customFrom, to: customTo } : undefined;
    fetchMyStats(period, range)
      .then((res) => {
        setData(res);
        setStatus("loaded");
      })
      .catch(() => setStatus("error"));
  }, [period, customFrom, customTo]);

  function selectPreset(key: Exclude<StatsPeriod, "custom">) {
    setPeriod(key);
    setShowCustomPanel(false);
  }

  function applyCustomRange() {
    if (!draftFrom || !draftTo || customRangeInvalid) return;
    setCustomFrom(draftFrom);
    setCustomTo(draftTo);
    setPeriod("custom");
  }

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const range = period === "custom" ? { from: customFrom, to: customTo } : undefined;
      const blob = await exportMyStats(period, range);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const filenameSuffix = period === "custom" ? `du-${customFrom}-au-${customTo}` : `${period}-${todayStr()}`;
      link.download = `statistiques-${filenameSuffix}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error("Export statistiques échoué :", err);
      setExportError(err instanceof Error ? err.message : "Export impossible. Réessayez dans un instant.");
    } finally {
      setExporting(false);
    }
  }

  const products = data?.products ?? [];
  const maxQuantity = products.length ? products[0].quantitySold : 0;
  const sectionLabel = period === "custom" ? "Plage personnalisée" : PERIOD_LABELS[period];

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-nuit">Statistiques</h1>
          <p className="text-sm text-gris">
            {data ? (
              <>
                {data.rangeLabel}
                {data.dateRangeLabel && <span className="text-gris"> · {data.dateRangeLabel}</span>}
              </>
            ) : (
              "Vos ventes par produit, à la loupe"
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start rounded-sm bg-gris-light p-1">
          {PRESET_PERIODS.map((key) => (
            <button
              key={key}
              onClick={() => selectPreset(key)}
              className="rounded-sm px-3 py-2 text-xs font-semibold transition-colors sm:px-4 sm:text-sm"
              style={{
                backgroundColor: period === key ? "white" : "transparent",
                color: period === key ? "#1A1A2E" : "#6B7280",
                boxShadow: period === key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {PERIOD_LABELS[key]}
            </button>
          ))}
          <button
            onClick={() => setShowCustomPanel((v) => !v)}
            className="rounded-sm px-3 py-2 text-xs font-semibold transition-colors sm:px-4 sm:text-sm"
            style={{
              backgroundColor: period === "custom" ? "white" : "transparent",
              color: period === "custom" ? "#1A1A2E" : "#6B7280",
              boxShadow: period === "custom" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}
          >
            📅 Personnalisé
          </button>
        </div>
      </div>

      {showCustomPanel && (
        <div className="mb-6 flex flex-wrap items-end gap-3 rounded bg-white p-4 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gris">Du</label>
            <input
              type="date"
              value={draftFrom}
              max={todayStr()}
              onChange={(e) => setDraftFrom(e.target.value)}
              className="rounded-sm border border-gris-light px-3 py-2 text-sm focus:border-golfe-green focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gris">Au</label>
            <input
              type="date"
              value={draftTo}
              max={todayStr()}
              onChange={(e) => setDraftTo(e.target.value)}
              className="rounded-sm border border-gris-light px-3 py-2 text-sm focus:border-golfe-green focus:outline-none"
            />
          </div>
          <button
            onClick={applyCustomRange}
            disabled={!draftFrom || !draftTo || customRangeInvalid}
            className="rounded-sm bg-golfe-green px-4 py-2 text-xs font-semibold text-white hover:bg-golfe-green-dark disabled:opacity-40"
          >
            Appliquer
          </button>
          {customRangeInvalid && <p className="text-xs text-red-500">La date de fin doit être après la date de début.</p>}
        </div>
      )}

      {status === "error" && (
        <div className="mb-6 rounded-sm bg-red-50 p-4 text-sm text-red-500">
          Impossible de charger vos statistiques. Réessayez plus tard.
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon="💰" label="Chiffre d'affaires" value={`${(data?.summary.revenueTotal ?? 0).toFixed(2)} €`} />
        <StatCard icon="🧾" label="Commandes livrées" value={String(data?.summary.orderCount ?? 0)} accentColor="#2196F3" />
        <StatCard icon="🛒" label="Panier moyen" value={`${(data?.summary.avgBasket ?? 0).toFixed(2)} €`} accentColor="#9C27B0" />
      </div>

      <div className="rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-heading text-base font-bold text-nuit">🏆 Produits vendus — {sectionLabel}</h3>
          <button
            onClick={handleExport}
            disabled={exporting || products.length === 0}
            className="rounded-sm bg-nuit px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {exporting ? "Export..." : "⬇️ Exporter en CSV"}
          </button>
        </div>
        {exportError && <p className="mb-3 text-xs text-red-500">{exportError}</p>}

        {status === "loaded" && products.length === 0 ? (
          <p className="py-6 text-center text-sm text-gris">Aucune vente livrée sur cette période.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gris-light text-xs uppercase tracking-wide text-gris">
                  <th className="py-2 pr-4 font-medium">#</th>
                  <th className="py-2 pr-4 font-medium">Produit</th>
                  <th className="py-2 pr-4 font-medium">Quantité vendue</th>
                  <th className="py-2 pr-4 font-medium">Commandes</th>
                  <th className="py-2 pr-4 font-medium">CA généré</th>
                  <th className="py-2 pr-4 font-medium">Popularité</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, index) => (
                  <tr key={p.productName} className="border-b border-gris-light last:border-0">
                    <td className="py-3 pr-4 text-sm font-bold text-gris">{index + 1}</td>
                    <td className="py-3 pr-4 text-sm font-semibold text-nuit">{p.productName}</td>
                    <td className="py-3 pr-4 text-sm text-nuit">{p.quantitySold}</td>
                    <td className="py-3 pr-4 text-sm text-gris">{p.orderCount}</td>
                    <td className="py-3 pr-4 text-sm font-bold text-golfe-green">{p.revenue.toFixed(2)} €</td>
                    <td className="py-3 pr-4">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-gris-light">
                        <div
                          className="h-2 rounded-full bg-golfe-green"
                          style={{ width: maxQuantity ? `${Math.max(6, (p.quantitySold / maxQuantity) * 100)}%` : "0%" }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
