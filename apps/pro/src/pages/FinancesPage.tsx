import React, { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { fetchMyFinances, type FinanceSummary, type WeeklyFinanceEntry } from "@/services/financesApi";

export function FinancesPage() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [weeklyHistory, setWeeklyHistory] = useState<WeeklyFinanceEntry[]>([]);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    fetchMyFinances()
      .then((data) => {
        setSummary(data.summary);
        setWeeklyHistory(data.weeklyHistory);
        setStatus("loaded");
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="flex-1 p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-nuit">Finances</h1>
          <p className="text-sm text-gris">
            Abonnement <span className="font-semibold text-golfe-green">{summary?.subscriptionType ?? "FREE"}</span> · Commission{" "}
            {((summary?.commissionRate ?? 0.15) * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {status === "error" && (
        <div className="mb-6 rounded bg-red-50 p-4 text-sm text-red-600">
          Impossible de charger vos finances. Réessayez plus tard.
        </div>
      )}

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard icon="💰" label="CA brut (mois)" value={`${(summary?.monthGross ?? 0).toFixed(2)} €`} />
        <StatCard icon="📉" label="Commission plateforme" value={`${(summary?.monthCommission ?? 0).toFixed(2)} €`} accentColor="#FF6B35" />
        <StatCard icon="✅" label="Net perçu (mois)" value={`${(summary?.monthNet ?? 0).toFixed(2)} €`} accentColor="#2196F3" />
      </div>

      {/* Pas de virement bancaire automatique implémenté côté plateforme pour
          l'instant : on est transparent là-dessus plutôt que d'afficher un
          faux statut "versé". */}
      <div className="mb-6 rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gris">Versements bancaires automatiques</p>
            <p className="font-heading text-lg font-bold text-nuit">Pas encore disponible</p>
          </div>
          <div className="rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-corail">Fonctionnalité à venir</div>
        </div>
      </div>

      <div className="rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <h3 className="mb-4 font-heading text-base font-bold text-nuit">📄 Chiffre d'affaires par semaine</h3>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gris-light text-xs uppercase tracking-wide text-gris">
              <th className="py-2 pr-4 font-medium">Période</th>
              <th className="py-2 pr-4 font-medium">Commandes</th>
              <th className="py-2 pr-4 font-medium">CA brut</th>
              <th className="py-2 pr-4 font-medium">Commission</th>
              <th className="py-2 pr-4 font-medium">Net perçu</th>
            </tr>
          </thead>
          <tbody>
            {weeklyHistory.map((week) => (
              <tr key={week.periodLabel} className="border-b border-gris-light last:border-0">
                <td className="py-3 pr-4 text-sm text-nuit">{week.periodLabel}</td>
                <td className="py-3 pr-4 text-sm text-gris">{week.orderCount}</td>
                <td className="py-3 pr-4 text-sm text-nuit">{week.grossAmount.toFixed(2)} €</td>
                <td className="py-3 pr-4 text-sm text-corail">-{week.commission.toFixed(2)} €</td>
                <td className="py-3 pr-4 text-sm font-bold text-nuit">{week.netAmount.toFixed(2)} €</td>
              </tr>
            ))}
            {status === "loaded" && weeklyHistory.every((w) => w.orderCount === 0) && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-gris">
                  Aucune commande livrée sur les 8 dernières semaines.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
