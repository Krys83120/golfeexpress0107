import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { RevenueChart } from "@/components/RevenueChart";
import { TopProductsCard } from "@/components/TopProductsCard";
import { OrdersTable } from "@/components/OrdersTable";
import { ParcelExpressLiveCard } from "@/components/ParcelExpressLiveCard";
import { useProDashboardStore, type PeriodFilter } from "@/store/useProDashboardStore";
import { useProOrdersStore } from "@/store/useProOrdersStore";
import { useAuthStore } from "@/store/useAuthStore";
import { fetchMyViews } from "@/services/viewsApi";
import { fetchStock } from "@/services/stockApi";
import {
  computeWeeklyRevenue,
  computeTopProducts,
  computeDashboardStats,
  filterOrdersByPeriod,
} from "@/services/dashboardAggregations";

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  today: "Aujourd'hui",
  week: "Cette semaine",
  month: "Ce mois",
};

interface DashboardPageProps {
  onViewAllOrders?: () => void;
}

export function DashboardPage({ onViewAllOrders }: DashboardPageProps) {
  const period = useProDashboardStore((s) => s.period);
  const setPeriod = useProDashboardStore((s) => s.setPeriod);

  const orders = useProOrdersStore((s) => s.orders);
  const status = useProOrdersStore((s) => s.status);
  const error = useProOrdersStore((s) => s.error);
  const loadOrders = useProOrdersStore((s) => s.loadOrders);

  const profile = useAuthStore((s) => s.profile);

  // Compteur de vues (19/09/2026, demande explicite de Krys) -- "vues" =
  // ouvertures de la fiche boutique côté app Client, cumul depuis toujours
  // (pas filtré par période contrairement au reste du dashboard, voir
  // GET /api/pros/me/views). null tant que non chargé, jamais affiché comme
  // "0" par erreur pendant le chargement.
  const [pageViews, setPageViews] = useState<number | null>(null);

  // Bandeau "en rupture" (ajout du 03/10/2026, demande de Krys -- voir
  // StockPage.tsx / PATCH /api/pros/me/stock). Simple reflet de l'état
  // actuel (isAvailable=false), jamais filtré par période contrairement au
  // reste du dashboard, ni par qui a déclenché la rupture (patron ou
  // employé) -- le patron doit voir TOUT ce qui est indisponible maintenant.
  const [outOfStockItems, setOutOfStockItems] = useState<string[]>([]);

  useEffect(() => {
    loadOrders();
    fetchMyViews()
      .then((data) => setPageViews(data.pageViews))
      .catch(() => setPageViews(null));
    fetchStock()
      .then((products) => {
        const items: string[] = [];
        products.forEach((p) => {
          if (!p.isAvailable) items.push(p.name);
          p.options.forEach((o) =>
            o.choices.forEach((c) => {
              if (!c.isAvailable) items.push(`${p.name} — ${c.name}`);
            })
          );
        });
        setOutOfStockItems(items);
      })
      .catch(() => setOutOfStockItems([]));
  }, []);

  const periodOrders = filterOrdersByPeriod(orders, period);
  const stats = computeDashboardStats(periodOrders);
  const weeklyRevenue = computeWeeklyRevenue(orders);
  const topProducts = computeTopProducts(periodOrders);
  const recentOrders = [...orders].slice(0, 8);

  const avgRating = profile?.rating ? Number(profile.rating) : null;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      {/* TOP BAR */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-nuit">Dashboard</h1>
          <p className="text-sm text-gris">Bienvenue, {profile?.businessName ?? "Commerçant"} 👋</p>
        </div>
        <div className="flex gap-2 self-start rounded-sm bg-gris-light p-1">
          {(Object.keys(PERIOD_LABELS) as PeriodFilter[]).map((key) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
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
        </div>
      </div>

      {status === "error" && (
        <div className="mb-6 rounded-sm bg-red-50 p-4 text-sm text-red-500">
          {error}{" "}
          <button onClick={loadOrders} className="font-semibold underline">
            Réessayer
          </button>
        </div>
      )}

      {/* STOCK -- bandeau visible uniquement s'il y a au moins une rupture en cours. */}
      {outOfStockItems.length > 0 && (
        <div className="mb-6 rounded-sm border border-[#FFD9BF] bg-[#FFF3E0] p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-nuit">
            <AlertTriangle size={16} className="text-[#FF6B35]" />
            {outOfStockItems.length} article{outOfStockItems.length > 1 ? "s" : ""} actuellement en rupture
          </p>
          <p className="mt-1 text-xs text-gris">
            {outOfStockItems.slice(0, 6).join(" · ")}
            {outOfStockItems.length > 6 ? "…" : ""}
          </p>
        </div>
      )}

      {/* STATS */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="💰" label="Chiffre d'affaires" value={`${stats.revenueTotal.toFixed(2)} €`} />
        <StatCard icon="🧾" label="Commandes" value={String(stats.orderCount)} accentColor="#2196F3" />
        <StatCard
          icon="⭐"
          label="Note moyenne"
          value={avgRating ? avgRating.toFixed(1) : "—"}
          accentColor="#FF6B35"
        />
        <StatCard
          icon="🏪"
          label="Statut boutique"
          value={profile?.status === "ACTIVE" ? "Actif" : "En attente"}
          accentColor="#9C27B0"
        />
        <StatCard
          icon="👁️"
          label="Vues de ma boutique"
          value={pageViews !== null ? String(pageViews) : "—"}
          accentColor="#2ECC71"
        />
      </div>

      {/* COLIS EXPRESS EN COURS (23/09/2026, retour de Krys : visu directe
          demandée sur le dashboard, plutôt que réservée à l'onglet Colis
          Express) -- toujours affichée, même sans course en cours (voir
          ParcelExpressLiveCard.tsx). */}
      <div className="mb-6">
        <ParcelExpressLiveCard />
      </div>

      {/* CHART + TOP PRODUCTS */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart data={weeklyRevenue} />
        </div>
        <TopProductsCard products={topProducts} />
      </div>

      {/* ORDERS TABLE */}
      <OrdersTable orders={recentOrders} onViewAll={onViewAllOrders} />
    </div>
  );
}
