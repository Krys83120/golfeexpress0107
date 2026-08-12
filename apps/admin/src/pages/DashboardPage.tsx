import React, { useEffect, useState } from "react";
import { StatCard } from "../components/StatCard";
import { GlobalRevenueChart } from "@/components/GlobalRevenueChart";
import { LiveMapCard } from "@/components/LiveMapCard";
import { ValidationCard } from "@/components/ValidationCard";
import { SettingsTable } from "@/components/SettingsTable";
import { SupportedCitiesGrid } from "@/components/SupportedCitiesGrid";
import { useAdminDashboardStore } from "@/store/useAdminDashboardStore";
import { useAdminSettingsStore } from "@/store/useAdminSettingsStore";
import { fetchAdminStats, fetchSupportedCities, fetchLiveRiders, type AdminStats, type SupportedCity, type LiveRiderPosition } from "@/services/adminDashboardApi";

interface DashboardPageProps {
  onNavigate?: (page: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const pendingValidations = useAdminDashboardStore((s) => s.pendingValidations);
  const approve = useAdminDashboardStore((s) => s.approve);
  const reject = useAdminDashboardStore((s) => s.reject);
  const loadPendingValidations = useAdminDashboardStore((s) => s.loadPendingValidations);

  const settings = useAdminSettingsStore((s) => s.settings);
  const loadSettings = useAdminSettingsStore((s) => s.loadSettings);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [cities, setCities] = useState<SupportedCity[]>([]);
  const [liveRiders, setLiveRiders] = useState<LiveRiderPosition[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadPendingValidations();
    loadSettings();

    Promise.all([fetchAdminStats(), fetchSupportedCities(), fetchLiveRiders()])
      .then(([statsData, citiesData, ridersData]) => {
        setStats(statsData);
        setCities(citiesData);
        setLiveRiders(ridersData);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Impossible de charger le dashboard."));

    // Rafraîchit la carte live toutes les 15s. TODO: remplacer par une
    // souscription Supabase Realtime (postgres_changes sur Rider) — voir
    // apps/api/REALTIME.md.
    const interval = setInterval(() => {
      fetchLiveRiders().then(setLiveRiders).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 p-8">
      {/* TOP BAR */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-nuit">Dashboard global</h1>
          <p className="text-sm text-gris">Vue d'ensemble de la plateforme Do You Geckoo 🦎</p>
        </div>
        <div className="rounded-sm bg-gris-light px-4 py-2 text-sm font-semibold text-nuit">
          Golfe de Saint-Tropez
        </div>
      </div>

      {loadError && <div className="mb-6 rounded-sm bg-red-50 p-4 text-sm text-red-500">{loadError}</div>}

      {/* STATS */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <StatCard icon="💰" label="Revenus plateforme (7j)" value={stats ? `${stats.platformRevenue7d.toFixed(0)} €` : "—"} />
        <StatCard
          icon="🧾"
          label="Commandes (7j)"
          value={stats ? String(stats.orderCount7d) : "—"}
          accentColor="#2196F3"
        />
        <StatCard
          icon="🏪"
          label="Commerçants actifs"
          value={stats ? String(stats.activeProCount) : "—"}
          accentColor="#FF6B35"
        />
        <StatCard
          icon="🛵"
          label="Livreurs actifs"
          value={stats ? String(stats.activeRiderCount) : "—"}
          accentColor="#9C27B0"
        />
      </div>

      {/* CHART + LIVE MAP */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <GlobalRevenueChart data={stats?.revenueByDay ?? []} />
        <LiveMapCard riders={liveRiders} />
      </div>

      {/* PENDING VALIDATIONS */}
      <div className="mb-6 rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-base font-bold text-nuit">
            🛡️ Validations en attente {pendingValidations.length > 0 ? `(${pendingValidations.length})` : ""}
          </h3>
          <button onClick={() => onNavigate?.("validations")} className="text-sm font-semibold text-golfe-green">
            Voir tout
          </button>
        </div>

        {pendingValidations.length === 0 ? (
          <div className="flex flex-col items-center py-10">
            <span className="text-4xl">✅</span>
            <p className="mt-2 text-sm text-gris">Aucune validation en attente</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pendingValidations.slice(0, 3).map((validation) => (
              <ValidationCard
                key={validation.id}
                validation={validation}
                onApprove={() => approve(validation.id, validation.kind)}
                onReject={() => onNavigate?.("validations")}
              />
            ))}
          </div>
        )}
      </div>

      {/* SETTINGS */}
      <div className="mb-6">
        <SettingsTable settings={settings} onEdit={() => onNavigate?.("settings")} />
      </div>

      {/* SUPPORTED CITIES */}
      <SupportedCitiesGrid cities={cities} />
    </div>
  );
}
