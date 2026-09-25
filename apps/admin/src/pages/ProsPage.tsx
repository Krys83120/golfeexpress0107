import React, { useEffect, useMemo, useState } from "react";
import { Search, MoreVertical, Star, Eye, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { PRO_STATUS_LABELS, SUBSCRIPTION_LABELS, PRO_CATEGORY_EMOJIS } from "@/services/proLabels";
import { fetchAdminPros, type AdminProRow } from "@/services/adminEntitiesApi";
import { fetchAdminProViews, type AdminProductViewRow } from "@/services/proViewsApi";
import { MapView, type MapPin } from "@/components/MapView";
import { ProDetailModal } from "@/components/ProDetailModal";

export function ProsPage() {
  const [search, setSearch] = useState("");
  const [pros, setPros] = useState<AdminProRow[]>([]);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [selectedPro, setSelectedPro] = useState<AdminProRow | null>(null);

  // Compteurs de vues (19/09/2026, demande explicite de Krys) -- chargés à
  // part de fetchAdminPros (route dédiée, voir proViewsApi.ts) : proViews en
  // Map pour un lookup direct par ligne du tableau, topProducts gardé tel
  // quel (déjà trié par vues décroissantes côté serveur) pour le panneau
  // "Produits les plus vus" plus bas.
  const [proViews, setProViews] = useState<Map<string, number>>(new Map());
  const [topProducts, setTopProducts] = useState<AdminProductViewRow[]>([]);

  // Tri + filtres par colonne (ajout du 25/09/2026, demande de Krys) -- tri
  // cliquable sur toutes les colonnes du tableau, filtres déroulants sur les
  // colonnes "catégorielles" (Ville, Abonnement, Statut) où filtrer par
  // valeur a du sens ; Note/Commandes/Vues restent triables mais pas
  // filtrables par plage, ça n'apportait pas grand-chose de plus que le tri.
  type SortKey = "name" | "city" | "subscription" | "rating" | "orders" | "views" | "status";
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterCity, setFilterCity] = useState("");
  const [filterSubscription, setFilterSubscription] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown size={12} className="text-gris-light" />;
    return sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

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
    fetchAdminProViews()
      .then((data) => {
        setProViews(new Map(data.proViews.map((p) => [p.proId, p.views])));
        setTopProducts(data.productViews.slice(0, 10));
      })
      .catch(() => {
        // Compteur secondaire -- une erreur ici ne doit pas empêcher
        // d'afficher la liste des commerçants elle-même.
      });
  }, []);

  // Valeurs disponibles pour les filtres déroulants -- dérivées des
  // commerçants réellement présents (pas de toutes les valeurs possibles de
  // l'enum) pour ne jamais proposer un filtre qui viderait la liste.
  const uniqueCities = useMemo(
    () => Array.from(new Set(pros.map((p) => p.addresses[0]?.city).filter((c): c is string => Boolean(c)))).sort(
      (a, b) => a.localeCompare(b)
    ),
    [pros]
  );
  const uniqueSubscriptions = useMemo(
    () => Array.from(new Set(pros.map((p) => p.subscriptionType))),
    [pros]
  );
  const uniqueStatuses = useMemo(() => Array.from(new Set(pros.map((p) => p.status))), [pros]);

  const filtered = useMemo(() => {
    let result = pros.filter((p) =>
      `${p.businessName} ${p.addresses[0]?.city ?? ""}`.toLowerCase().includes(search.toLowerCase())
    );
    if (filterCity) result = result.filter((p) => p.addresses[0]?.city === filterCity);
    if (filterSubscription) result = result.filter((p) => p.subscriptionType === filterSubscription);
    if (filterStatus) result = result.filter((p) => p.status === filterStatus);

    if (sortKey) {
      const dir = sortDir === "asc" ? 1 : -1;
      result = [...result].sort((a, b) => {
        switch (sortKey) {
          case "name":
            return a.businessName.localeCompare(b.businessName) * dir;
          case "city":
            return (a.addresses[0]?.city ?? "").localeCompare(b.addresses[0]?.city ?? "") * dir;
          case "subscription":
            return SUBSCRIPTION_LABELS[a.subscriptionType].label.localeCompare(
              SUBSCRIPTION_LABELS[b.subscriptionType].label
            ) * dir;
          case "status":
            return PRO_STATUS_LABELS[a.status].label.localeCompare(PRO_STATUS_LABELS[b.status].label) * dir;
          case "orders":
            return (a._count.orders - b._count.orders) * dir;
          case "views":
            return ((proViews.get(a.id) ?? 0) - (proViews.get(b.id) ?? 0)) * dir;
          case "rating": {
            // Un commerçant sans note ("—") reste toujours en fin de liste,
            // quel que soit le sens du tri -- comportement attendu pour ce
            // genre de tableau (sinon "trier par note" ferait remonter les
            // non-notés en premier au tri décroissant, contre-intuitif).
            const ra = a.rating ? Number(a.rating) : null;
            const rb = b.rating ? Number(b.rating) : null;
            if (ra === null && rb === null) return 0;
            if (ra === null) return 1;
            if (rb === null) return -1;
            return (ra - rb) * dir;
          }
          default:
            return 0;
        }
      });
    }
    return result;
  }, [pros, search, filterCity, filterSubscription, filterStatus, sortKey, sortDir, proViews]);

  const pins: MapPin[] = pros
    .filter((p) => p.addresses[0])
    .map((p) => ({
      id: p.id,
      lat: p.addresses[0].lat,
      lng: p.addresses[0].lng,
      label: PRO_CATEGORY_EMOJIS[p.category] ?? "📦",
      imageUrl: p.logo,
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
          <p className="text-sm text-gris">
            {filtered.length === pros.length
              ? `${pros.length} commerçants sur la plateforme`
              : `${filtered.length} sur ${pros.length} commerçants`}
          </p>
        </div>
      </div>

      <div className="mb-6 rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <h3 className="mb-4 font-heading text-base font-bold text-nuit">🗺️ Répartition géographique</h3>
        <MapView pins={pins} height={480} emptyLabel="Aucun commerçant géolocalisé" />
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-sm border border-gris-light bg-white px-3 py-2">
          <Search size={16} className="text-gris" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un commerçant..."
            className="flex-1 text-sm outline-none"
          />
        </div>
        {(filterCity || filterSubscription || filterStatus || sortKey) && (
          <button
            onClick={() => {
              setFilterCity("");
              setFilterSubscription("");
              setFilterStatus("");
              setSortKey(null);
              setSortDir("asc");
            }}
            className="whitespace-nowrap rounded-sm border border-gris-light px-3 py-2 text-xs font-semibold text-gris hover:bg-gris-light"
          >
            Réinitialiser
          </button>
        )}
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
                <th className="py-2 pr-4 font-medium">
                  <button
                    onClick={() => handleSort("name")}
                    className="flex items-center gap-1 uppercase tracking-wide text-gris hover:text-nuit"
                  >
                    Commerçant {sortIcon("name")}
                  </button>
                </th>
                <th className="py-2 pr-4 font-medium">
                  <button
                    onClick={() => handleSort("city")}
                    className="flex items-center gap-1 uppercase tracking-wide text-gris hover:text-nuit"
                  >
                    Ville {sortIcon("city")}
                  </button>
                  <select
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                    className="mt-1 w-full max-w-[110px] rounded-sm border border-gris-light bg-white px-1 py-0.5 text-xs normal-case tracking-normal text-nuit outline-none"
                  >
                    <option value="">Toutes</option>
                    {uniqueCities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="py-2 pr-4 font-medium">
                  <button
                    onClick={() => handleSort("subscription")}
                    className="flex items-center gap-1 uppercase tracking-wide text-gris hover:text-nuit"
                  >
                    Abonnement {sortIcon("subscription")}
                  </button>
                  <select
                    value={filterSubscription}
                    onChange={(e) => setFilterSubscription(e.target.value)}
                    className="mt-1 w-full max-w-[110px] rounded-sm border border-gris-light bg-white px-1 py-0.5 text-xs normal-case tracking-normal text-nuit outline-none"
                  >
                    <option value="">Tous</option>
                    {uniqueSubscriptions.map((s) => (
                      <option key={s} value={s}>
                        {SUBSCRIPTION_LABELS[s].label}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="py-2 pr-4 font-medium">
                  <button
                    onClick={() => handleSort("rating")}
                    className="flex items-center gap-1 uppercase tracking-wide text-gris hover:text-nuit"
                  >
                    Note {sortIcon("rating")}
                  </button>
                </th>
                <th className="py-2 pr-4 font-medium">
                  <button
                    onClick={() => handleSort("orders")}
                    className="flex items-center gap-1 uppercase tracking-wide text-gris hover:text-nuit"
                  >
                    Commandes {sortIcon("orders")}
                  </button>
                </th>
                <th className="py-2 pr-4 font-medium">
                  <button
                    onClick={() => handleSort("views")}
                    className="flex items-center gap-1 uppercase tracking-wide text-gris hover:text-nuit"
                  >
                    Vues {sortIcon("views")}
                  </button>
                </th>
                <th className="py-2 pr-4 font-medium">
                  <button
                    onClick={() => handleSort("status")}
                    className="flex items-center gap-1 uppercase tracking-wide text-gris hover:text-nuit"
                  >
                    Statut {sortIcon("status")}
                  </button>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="mt-1 w-full max-w-[110px] rounded-sm border border-gris-light bg-white px-1 py-0.5 text-xs normal-case tracking-normal text-nuit outline-none"
                  >
                    <option value="">Tous</option>
                    {uniqueStatuses.map((s) => (
                      <option key={s} value={s}>
                        {PRO_STATUS_LABELS[s].label}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="py-2 pr-4 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((pro) => {
                const statusMeta = PRO_STATUS_LABELS[pro.status];
                const subMeta = SUBSCRIPTION_LABELS[pro.subscriptionType];
                const rating = pro.rating ? Number(pro.rating) : null;
                return (
                  <tr key={pro.id} className="relative border-b border-gris-light last:border-0">
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
                      <span className="flex items-center gap-1 text-sm text-nuit">
                        <Eye size={13} className="text-gris" />
                        {proViews.get(pro.id) ?? 0}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{ backgroundColor: statusMeta.bg, color: statusMeta.text }}
                      >
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="relative py-3 pr-4 text-right">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === pro.id ? null : pro.id)}
                        className="rounded-sm p-1.5 text-gris hover:bg-gris-light"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openMenuId === pro.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                          <div className="absolute right-4 top-10 z-20 w-48 rounded-sm border border-gris-light bg-white py-1 shadow-lg">
                            <button
                              onClick={() => {
                                setSelectedPro(pro);
                                setOpenMenuId(null);
                              }}
                              className="block w-full px-4 py-2 text-left text-sm text-nuit hover:bg-gris-light"
                            >
                              Voir / modifier / valider
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {topProducts.length > 0 && (
        <div className="mt-6 rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
          <h3 className="mb-4 font-heading text-base font-bold text-nuit">👁️ Produits les plus vus</h3>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gris-light text-xs uppercase tracking-wide text-gris">
                <th className="py-2 pr-4 font-medium">Produit</th>
                <th className="py-2 pr-4 font-medium">Commerçant</th>
                <th className="py-2 pr-4 font-medium">Vues</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p) => (
                <tr key={p.productId} className="border-b border-gris-light last:border-0">
                  <td className="py-2.5 pr-4 text-sm font-semibold text-nuit">{p.name}</td>
                  <td className="py-2.5 pr-4 text-sm text-gris">{p.businessName}</td>
                  <td className="py-2.5 pr-4 text-sm text-nuit">{p.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedPro && (
        <ProDetailModal
          pro={selectedPro}
          onClose={() => setSelectedPro(null)}
          onUpdated={(updated) => setPros((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))}
        />
      )}
    </div>
  );
}
