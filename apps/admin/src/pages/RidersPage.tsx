import React, { useEffect, useState } from "react";
import { Search, MoreVertical, Star } from "lucide-react";
import { RIDER_STATUS_LABELS, ADMIN_VEHICLE_LABELS } from "@/services/riderLabels";
import { fetchAdminRiders, type AdminRiderRow } from "@/services/adminEntitiesApi";

export function RidersPage() {
  const [search, setSearch] = useState("");
  const [riders, setRiders] = useState<AdminRiderRow[]>([]);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminRiders()
      .then((data) => {
        setRiders(data);
        setStatus("loaded");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Impossible de charger les livreurs.");
        setStatus("error");
      });
  }, []);

  const filtered = riders.filter((r) =>
    `${r.user.firstName} ${r.user.lastName}`.toLowerCase().includes(search.toLowerCase())
  );
  const onlineCount = riders.filter((r) => r.isOnline).length;

  return (
    <div className="flex-1 p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-nuit">Livreurs</h1>
          <p className="text-sm text-gris">
            {riders.length} livreurs · <span className="font-semibold text-golfe-green">{onlineCount} en ligne</span>
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-sm border border-gris-light bg-white px-3 py-2">
        <Search size={16} className="text-gris" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un livreur..."
          className="flex-1 text-sm outline-none"
        />
      </div>

      {status === "error" && <div className="mb-4 rounded-sm bg-red-50 p-4 text-sm text-red-500">{error}</div>}

      <div className="rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        {status === "loading" && riders.length === 0 ? (
          <p className="py-12 text-center text-sm text-gris">Chargement des livreurs...</p>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-gris">Aucun livreur trouvé.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gris-light text-xs uppercase tracking-wide text-gris">
                <th className="py-2 pr-4 font-medium">Livreur</th>
                <th className="py-2 pr-4 font-medium">Véhicule</th>
                <th className="py-2 pr-4 font-medium">En ligne</th>
                <th className="py-2 pr-4 font-medium">Note</th>
                <th className="py-2 pr-4 font-medium">Livraisons</th>
                <th className="py-2 pr-4 font-medium">Gains totaux</th>
                <th className="py-2 pr-4 font-medium">Statut</th>
                <th className="py-2 pr-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((rider) => {
                const statusMeta = RIDER_STATUS_LABELS[rider.status];
                const vehicleMeta = ADMIN_VEHICLE_LABELS[rider.vehicleType];
                const rating = rider.rating ? Number(rider.rating) : null;
                return (
                  <tr key={rider.id} className="border-b border-gris-light last:border-0">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gris-light text-sm font-bold text-nuit">
                          {rider.user.firstName[0]}
                          {rider.user.lastName[0]}
                        </div>
                        <span className="text-sm font-semibold text-nuit">
                          {rider.user.firstName} {rider.user.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-sm text-nuit">
                      {vehicleMeta.emoji} {vehicleMeta.label}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="flex items-center gap-1.5 text-xs">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: rider.isOnline ? "#2ECC71" : "#D1D5DB" }}
                        />
                        <span className="text-gris">{rider.isOnline ? "En ligne" : "Hors ligne"}</span>
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      {rating && rider.ratingCount > 0 ? (
                        <div className="flex items-center gap-1 text-sm text-nuit">
                          <Star size={12} fill="#FF6B35" color="#FF6B35" />
                          {rating.toFixed(1)}
                          <span className="text-xs text-gris">({rider.ratingCount})</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gris">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-sm text-nuit">{rider.totalDeliveries}</td>
                    <td className="py-3 pr-4 text-sm font-semibold text-nuit">
                      {Number(rider.totalEarnings) > 0 ? `${Number(rider.totalEarnings).toFixed(2)} €` : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{ backgroundColor: statusMeta.bg, color: statusMeta.text }}
                      >
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <button className="rounded-sm p-1.5 text-gris hover:bg-gris-light">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
