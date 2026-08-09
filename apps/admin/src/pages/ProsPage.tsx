import React, { useEffect, useState } from "react";
import { Search, MoreVertical, Star } from "lucide-react";
import { PRO_STATUS_LABELS, SUBSCRIPTION_LABELS, PRO_CATEGORY_EMOJIS } from "@/services/proLabels";
import { fetchAdminPros, type AdminProRow } from "@/services/adminEntitiesApi";
import { MapView, type MapPin } from "@/components/MapView";

export function ProsPage() {
  const [search, setSearch] = useState("");
  const [pros, setPros] = useState<AdminProRow[]>([]);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminPros()
      .then((data) => {
        setPros(data);
        setStatus("loaded");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Impossible de charger les commerçants.");
        setStatus("error");
      });
  }, []);

  const filtered = pros.filter((p) =>
    `${p.businessName} ${p.addresses[0]?.city ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const pins: MapPin[] = pros
    .filter((p) => p.addresses[0])
    .map((p) => ({
      id: p.id,
      lat: p.addresses[0].lat,
      lng: p.addresses[0].lng,
      label: PRO_CATEGORY_EMOJIS[p.category] ?? "📦",
      color: "#2ECC71",
      popupContent: (
        <div>
          <strong>{p.businessName}</strong>
          <br />
          {p.addresses[0].city}
        </div>
      ),
    }));

  return (
    <div className="flex-1 p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-nuit">Commerçants</h1>
          <p className="text-sm text-gris">{pros.length} commerçants sur la plateforme</p>
        </div>
      </div>

      <div className="mb-6 rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <h3 className="mb-4 font-heading text-base font-bold text-nuit">🗺️ Répartition géographique</h3>
        <MapView pins={pins} height={280} emptyLabel="Aucun commerçant géolocalisé" />
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-sm border border-gris-light bg-white px-3 py-2">
        <Search size={16} className="text-gris" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un commerçant..."
          className="flex-1 text-sm outline-none"
        />
      </div>

      {status === "error" && <div className="mb-4 rounded-sm bg-red-50 p-4 text-sm text-red-500">{error}</div>}

      <div className="rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        {status === "loading" && pros.length === 0 ? (
          <p className="py-12 text-center text-sm text-gris">Chargement des commerçants...</p>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-gris">Aucun commerçant trouvé.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gris-light text-xs uppercase tracking-wide text-gris">
                <th className="py-2 pr-4 font-medium">Commerçant</th>
                <th className="py-2 pr-4 font-medium">Ville</th>
                <th className="py-2 pr-4 font-medium">Abonnement</th>
                <th className="py-2 pr-4 font-medium">Note</th>
                <th className="py-2 pr-4 font-medium">Commandes</th>
                <th className="py-2 pr-4 font-medium">Statut</th>
                <th className="py-2 pr-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((pro) => {
                const statusMeta = PRO_STATUS_LABELS[pro.status];
                const subMeta = SUBSCRIPTION_LABELS[pro.subscriptionType];
                const rating = pro.rating ? Number(pro.rating) : null;
                return (
                  <tr key={pro.id} className="border-b border-gris-light last:border-0">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gris-light text-lg">
                          {PRO_CATEGORY_EMOJIS[pro.category] ?? "📦"}
                        </div>
                        <span className="text-sm font-semibold text-nuit">{pro.businessName}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-sm text-gris">{pro.addresses[0]?.city ?? "—"}</td>
                    <td className="py-3 pr-4">
                      <span className="text-sm font-semibold" style={{ color: subMeta.color }}>
                        {subMeta.label}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      {rating && pro.ratingCount > 0 ? (
                        <div className="flex items-center gap-1 text-sm text-nuit">
                          <Star size={12} fill="#FF6B35" color="#FF6B35" />
                          {rating.toFixed(1)}
                          <span className="text-xs text-gris">({pro.ratingCount})</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gris">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-sm text-nuit">{pro._count.orders}</td>
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
