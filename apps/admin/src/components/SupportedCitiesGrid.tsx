import React from "react";
import type { SupportedCity } from "@/services/adminDashboardApi";

interface SupportedCitiesGridProps {
  cities: SupportedCity[];
}

export function SupportedCitiesGrid({ cities }: SupportedCitiesGridProps) {
  return (
    <div className="rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <h3 className="mb-4 font-heading text-base font-bold text-nuit">🏙️ Villes du Golfe couvertes</h3>
      <div className="grid grid-cols-3 gap-3">
        {cities.map((city) => (
          <div key={city.name} className="rounded-sm bg-gris-light p-3.5">
            <p className="text-sm font-semibold text-nuit">{city.name}</p>
            <div className="mt-2 flex gap-3 text-xs text-gris">
              <span>🏪 {city.activePros}</span>
              <span>🛵 {city.activeRiders}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
