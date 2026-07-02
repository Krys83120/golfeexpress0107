import React, { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { fetchAdminStats, type AdminStats } from "@/services/adminDashboardApi";
import { PRO_CATEGORY_EMOJIS } from "@/services/proLabels";
import { MOCK_PLATFORM_PAYOUTS } from "@/services/mockAdminFinances";
import type { ProCategory } from "@golfeexpress/types";

const CATEGORY_NAMES: Record<string, string> = {
  RESTAURANT: "Restaurants",
  BOULANGERIE: "Boulangeries",
  BOUCHERIE: "Boucheries",
  EPICERIE: "Épiceries",
  PHARMACIE: "Pharmacies",
  FLEURISTE: "Fleuristes",
  LIBRAIRIE: "Librairies",
  PARFUMERIE: "Parfumeries",
  AUTRE: "Autres",
};

export function AdminFinancesPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminStats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "Impossible de charger les finances."));
  }, []);

  const proPayouts7d = stats?.revenueByDay.reduce((sum, d) => sum + d.pros, 0) ?? 0;
  const riderPayouts7d = stats?.revenueByDay.reduce((sum, d) => sum + d.riders, 0) ?? 0;
  const avgCommissionRate = stats && stats.gmv7d > 0 ? stats.platformRevenue7d / stats.gmv7d : 0;
  const maxCategoryRevenue = stats?.categoryBreakdown.length
    ? Math.max(...stats.categoryBreakdown.map((c) => c.revenue))
    : 1;

  return (
    <div className="flex-1 p-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold text-nuit">Finances plateforme</h1>
        <p className="text-sm text-gris">Vue consolidée des revenus GolfeExpress (7 derniers jours)</p>
      </div>

      {error && <div className="mb-6 rounded-sm bg-red-50 p-4 text-sm text-red-500">{error}</div>}

      <div className="mb-6 grid grid-cols-4 gap-4">
        <StatCard icon="💰" label="Volume total (GMV, 7j)" value={stats ? `${stats.gmv7d.toFixed(0)} €` : "—"} />
        <StatCard
          icon="🏦"
          label="Revenus plateforme (7j)"
          value={stats ? `${stats.platformRevenue7d.toFixed(0)} €` : "—"}
          accentColor="#2196F3"
        />
        <StatCard
          icon="🏪"
          label="Reversé aux commerçants"
          value={`${proPayouts7d.toFixed(0)} €`}
          accentColor="#FF6B35"
        />
        <StatCard icon="🛵" label="Reversé aux livreurs" value={`${riderPayouts7d.toFixed(0)} €`} accentColor="#9C27B0" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
          <h3 className="mb-4 font-heading text-base font-bold text-nuit">📊 Revenus par catégorie</h3>
          {!stats || stats.categoryBreakdown.length === 0 ? (
            <p className="py-6 text-center text-sm text-gris">Pas encore de données.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {stats.categoryBreakdown.map((cat) => (
                <div key={cat.category}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-nuit">
                      {PRO_CATEGORY_EMOJIS[cat.category as ProCategory] ?? "📦"} {CATEGORY_NAMES[cat.category] ?? cat.category}
                    </span>
                    <span className="font-semibold text-nuit">{cat.revenue.toFixed(0)} €</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gris-light">
                    <div
                      className="h-full rounded-full bg-golfe-green"
                      style={{ width: `${(cat.revenue / maxCategoryRevenue) * 100}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-gris">{cat.orderCount} commandes</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
          <h3 className="mb-4 font-heading text-base font-bold text-nuit">⚙️ Taux moyen</h3>
          <div className="flex flex-col items-center justify-center py-6">
            <p className="font-heading text-5xl font-extrabold text-golfe-green">
              {(avgCommissionRate * 100).toFixed(1)}%
            </p>
            <p className="mt-2 text-sm text-gris">Commission moyenne plateforme (7j)</p>
          </div>
        </div>
      </div>

      {/* NOTE: pas de modèle Payout en base — la table ci-dessous reste un
          mock illustratif. Les chiffres globaux ci-dessus sont en revanche
          réels, dérivés des commandes livrées. */}
      <div className="rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <h3 className="mb-4 font-heading text-base font-bold text-nuit">💸 Derniers versements</h3>
        <p className="mb-4 text-xs text-gris">
          Exemple illustratif — les versements automatiques ne sont pas encore implémentés côté backend.
        </p>
        <table className="w-full text-left opacity-50">
          <thead>
            <tr className="border-b border-gris-light text-xs uppercase tracking-wide text-gris">
              <th className="py-2 pr-4 font-medium">Type</th>
              <th className="py-2 pr-4 font-medium">Bénéficiaire</th>
              <th className="py-2 pr-4 font-medium">Montant</th>
              <th className="py-2 pr-4 font-medium">Statut</th>
              <th className="py-2 pr-4 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_PLATFORM_PAYOUTS.map((payout) => (
              <tr key={payout.id} className="border-b border-gris-light last:border-0">
                <td className="py-3 pr-4 text-sm text-nuit">{payout.recipientType === "PRO" ? "🏪 Commerçant" : "🛵 Livreur"}</td>
                <td className="py-3 pr-4 text-sm font-semibold text-nuit">{payout.recipientName}</td>
                <td className="py-3 pr-4 text-sm font-bold text-nuit">{payout.amount.toFixed(2)} €</td>
                <td className="py-3 pr-4">
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: payout.status === "paid" ? "#E8F5E9" : "#FFF3E0",
                      color: payout.status === "paid" ? "#2ECC71" : "#FF6B35",
                    }}
                  >
                    {payout.status === "paid" ? "Versé" : "En attente"}
                  </span>
                </td>
                <td className="py-3 pr-4 text-sm text-gris">{payout.dateLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
