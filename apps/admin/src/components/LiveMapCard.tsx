import React from "react";
import type { LiveRiderPosition } from "@/services/adminDashboardApi";
import { MapView, type MapPin } from "@/components/MapView";

interface LiveMapCardProps {
  riders: LiveRiderPosition[];
}

const VEHICLE_EMOJIS: Record<string, string> = {
  SCOOTER: "🛵",
  VOITURE: "🚗",
  VELO: "🚲",
  ELECTRIQUE: "⚡",
};

export function LiveMapCard({ riders }: LiveMapCardProps) {
  const activeCount = riders.filter((r) => r.isDelivering).length;

  const pins: MapPin[] = riders.map((r) => ({
    id: r.id,
    lat: r.lat,
    lng: r.lng,
    color: r.isDelivering ? "#FF6B35" : "#6B7280",
    label: VEHICLE_EMOJIS[r.vehicleType] ?? "🛵",
    popupContent: r.isDelivering ? "En livraison" : "Disponible",
  }));

  return (
    <div className="rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-heading text-base font-bold text-nuit">🗺️ Carte live — Golfe de Saint-Tropez</h3>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-golfe-green">
          <span className="h-2 w-2 rounded-full bg-golfe-green" /> {activeCount} en livraison
        </span>
      </div>

      <MapView pins={pins} height={260} emptyLabel="Aucun livreur en ligne actuellement" />

      <div className="mt-3 text-right text-xs text-gris">📍 {riders.length} livreurs actifs</div>
    </div>
  );
}
