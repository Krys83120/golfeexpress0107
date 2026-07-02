import React, { useEffect } from "react";
import { StatCard } from "@/components/StatCard";
import { useProOrdersStore } from "@/store/useProOrdersStore";
import { useAuthStore } from "@/store/useAuthStore";
import { OrderStatus } from "@golfeexpress/types";
import { MOCK_PAYOUTS } from "@/services/mockFinances";

export function FinancesPage() {
  const orders = useProOrdersStore((s) => s.orders);
  const loadOrders = useProOrdersStore((s) => s.loadOrders);
  const profile = useAuthStore((s) => s.profile);

  useEffect(() => {
    loadOrders();
  }, []);

  const now = new Date();
  const monthOrders = orders.filter((o) => {
    const placed = new Date(o.placedAt);
    return (
      o.status === OrderStatus.DELIVERED &&
      placed.getMonth() === now.getMonth() &&
      placed.getFullYear() === now.getFullYear()
    );
  });

  const monthGross = monthOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);
  const monthCommission = monthOrders.reduce((sum, o) => sum + (Number(o.subtotal) - Number(o.proEarnings)), 0);
  const monthNet = monthOrders.reduce((sum, o) => sum + Number(o.proEarnings), 0);
  const commissionRate = profile?.commissionRate ? Number(profile.commissionRate) : 0.15;

  return (
    <div className="flex-1 p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-nuit">Finances</h1>
          <p className="text-sm text-gris">
            Abonnement <span className="font-semibold text-golfe-green">{profile?.subscriptionType ?? "FREE"}</span> · Commission{" "}
            {(commissionRate * 100).toFixed(0)}%
          </p>
        </div>
        <button className="rounded-sm border-2 border-gris-light px-4 py-2 text-sm font-semibold text-nuit">
          Télécharger le relevé
        </button>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard icon="💰" label="CA brut (mois)" value={`${monthGross.toFixed(2)} €`} />
        <StatCard icon="📉" label="Commission plateforme" value={`${monthCommission.toFixed(2)} €`} accentColor="#FF6B35" />
        <StatCard icon="✅" label="Net perçu (mois)" value={`${monthNet.toFixed(2)} €`} accentColor="#2196F3" />
      </div>

      {/* NOTE: pas de modèle Payout en base — l'historique ci-dessous reste
          un mock illustratif. Pour rendre cette section réelle, il faudrait
          un modèle Prisma Payout (montant, période, statut, date de
          versement) alimenté par un job de versement périodique, en plus
          d'une route GET /api/pros/me/payouts. */}
      <div className="mb-6 rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gris">Prochain versement</p>
            <p className="font-heading text-2xl font-extrabold text-nuit">— (à venir)</p>
          </div>
          <div className="rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-corail">
            Fonctionnalité à venir
          </div>
        </div>
      </div>

      <div className="rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <h3 className="mb-4 font-heading text-base font-bold text-nuit">📄 Historique des versements</h3>
        <p className="mb-4 text-xs text-gris">
          Exemple illustratif — les versements automatiques ne sont pas encore implémentés côté backend.
        </p>
        <table className="w-full text-left opacity-50">
          <thead>
            <tr className="border-b border-gris-light text-xs uppercase tracking-wide text-gris">
              <th className="py-2 pr-4 font-medium">Période</th>
              <th className="py-2 pr-4 font-medium">CA brut</th>
              <th className="py-2 pr-4 font-medium">Commission</th>
              <th className="py-2 pr-4 font-medium">Net perçu</th>
              <th className="py-2 pr-4 font-medium">Statut</th>
              <th className="py-2 pr-4 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_PAYOUTS.map((payout) => (
              <tr key={payout.id} className="border-b border-gris-light last:border-0">
                <td className="py-3 pr-4 text-sm text-nuit">{payout.periodLabel}</td>
                <td className="py-3 pr-4 text-sm text-nuit">{payout.grossAmount.toFixed(2)} €</td>
                <td className="py-3 pr-4 text-sm text-corail">-{payout.commission.toFixed(2)} €</td>
                <td className="py-3 pr-4 text-sm font-bold text-nuit">{payout.netAmount.toFixed(2)} €</td>
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
