import React, { useEffect, useMemo, useState } from "react";
import { OrderStatus, type Order } from "@golfeexpress/types";
import { useAdminOrdersStore } from "@/store/useAdminOrdersStore";
import { ORDER_STATUS_LABELS } from "@/services/orderStatusLabels";

interface KanbanColumn {
  title: string;
  emoji: string;
  statuses: OrderStatus[];
}

// Mêmes colonnes que le Kanban de apps/pro/src/pages/OrdersPage.tsx, mais
// ici toutes boutiques confondues (vue plateforme) et en lecture seule --
// l'admin observe le flux, la gestion (avancer/annuler) reste au Pro/Rider.
const COLUMNS: KanbanColumn[] = [
  { title: "Nouvelles", emoji: "🆕", statuses: [OrderStatus.PENDING, OrderStatus.CONFIRMED] },
  { title: "En préparation", emoji: "👨‍🍳", statuses: [OrderStatus.PREPARING] },
  { title: "Prêtes", emoji: "✅", statuses: [OrderStatus.READY] },
  {
    title: "En livraison",
    emoji: "🛵",
    statuses: [OrderStatus.RIDER_ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.IN_DELIVERY],
  },
  { title: "Terminées", emoji: "🏁", statuses: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] },
];

const ALL = "all";

function formatPlacedAt(isoDate: string): string {
  const minutes = Math.round((Date.now() - new Date(isoDate).getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 24 * 60) return `il y a ${Math.round(minutes / 60)}h`;
  return new Date(isoDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** Clé de jour locale (YYYY-MM-DD) — pas UTC, pour regrouper comme l'admin le voit à l'écran. */
function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dayKey(isoDate: string): string {
  return localDayKey(new Date(isoDate));
}

function formatDayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (key === localDayKey(today)) return "Aujourd'hui";
  if (key === localDayKey(yesterday)) return "Hier";
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export function OrdersPage() {
  const orders = useAdminOrdersStore((s) => s.orders);
  const status = useAdminOrdersStore((s) => s.status);
  const error = useAdminOrdersStore((s) => s.error);
  const loadOrders = useAdminOrdersStore((s) => s.loadOrders);

  // Filtres -- par défaut on affiche uniquement le jour le plus récent
  // présent dans les données (généralement "aujourd'hui") pour ne pas
  // saturer la page avec tout l'historique d'un coup. La ville et le
  // commerçant restent en "Toutes/Tous" par défaut.
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>(ALL);
  const [selectedProId, setSelectedProId] = useState<string>(ALL);

  useEffect(() => {
    loadOrders();
    // Vue Admin temps réel : les commandes changent de statut en continu
    // (actions Pro/Rider), donc on rafraîchit périodiquement comme pour la
    // carte live du Dashboard (voir DashboardPage.tsx) plutôt que d'exiger
    // un rechargement manuel de la page.
    const interval = setInterval(() => loadOrders(), 15000);
    return () => clearInterval(interval);
  }, []);

  // Dès que les commandes sont chargées, on présélectionne le jour le plus
  // récent (les commandes arrivent déjà triées du plus récent au plus
  // ancien -- voir GET /api/orders) plutôt que de laisser "Tous les jours"
  // par défaut.
  useEffect(() => {
    if (selectedDay === null && orders.length > 0) {
      setSelectedDay(dayKey(orders[0].placedAt));
    }
  }, [orders, selectedDay]);

  const availableDays = useMemo(() => {
    const keys = new Set(orders.map((o) => dayKey(o.placedAt)));
    return Array.from(keys).sort((a, b) => (a < b ? 1 : -1));
  }, [orders]);

  const availableCities = useMemo(() => {
    const cities = new Set(
      orders.map((o) => o.toAddress?.city).filter((c): c is string => !!c)
    );
    return Array.from(cities).sort((a, b) => a.localeCompare(b, "fr"));
  }, [orders]);

  const availablePros = useMemo(() => {
    const byId = new Map<string, string>();
    for (const o of orders) {
      if (o.pro?.id && o.pro.businessName) byId.set(o.pro.id, o.pro.businessName);
    }
    return Array.from(byId.entries()).sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o: Order) => {
      if (selectedDay && selectedDay !== ALL && dayKey(o.placedAt) !== selectedDay) return false;
      if (selectedCity !== ALL && o.toAddress?.city !== selectedCity) return false;
      if (selectedProId !== ALL && o.pro?.id !== selectedProId) return false;
      return true;
    });
  }, [orders, selectedDay, selectedCity, selectedProId]);

  const selectClass =
    "rounded-sm border border-gris-light bg-white px-3 py-2 text-sm text-nuit focus:border-golfe-green focus:outline-none";

  return (
    <div className="flex-1 p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-nuit">Commandes</h1>
          <p className="text-sm text-gris">
            Vue d'ensemble de toutes les commandes de la plateforme, tous commerçants confondus
          </p>
        </div>
      </div>

      {/* FILTRES */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          className={selectClass}
          value={selectedDay ?? ALL}
          onChange={(e) => setSelectedDay(e.target.value)}
        >
          <option value={ALL}>Tous les jours</option>
          {availableDays.map((key) => (
            <option key={key} value={key}>
              {formatDayLabel(key)}
            </option>
          ))}
        </select>

        <select className={selectClass} value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
          <option value={ALL}>Toutes les villes</option>
          {availableCities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>

        <select className={selectClass} value={selectedProId} onChange={(e) => setSelectedProId(e.target.value)}>
          <option value={ALL}>Tous les commerçants</option>
          {availablePros.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>

        {((selectedDay && selectedDay !== ALL) || selectedCity !== ALL || selectedProId !== ALL) && (
          <button
            onClick={() => {
              setSelectedDay(ALL);
              setSelectedCity(ALL);
              setSelectedProId(ALL);
            }}
            className="text-sm font-semibold text-golfe-green"
          >
            Réinitialiser les filtres
          </button>
        )}

        <span className="ml-auto text-xs text-gris">
          {filteredOrders.length} commande{filteredOrders.length > 1 ? "s" : ""} affichée
          {filteredOrders.length > 1 ? "s" : ""}
        </span>
      </div>

      {status === "error" && (
        <div className="mb-6 rounded-sm bg-red-50 p-4 text-sm text-red-500">
          {error}{" "}
          <button onClick={loadOrders} className="font-semibold underline">
            Réessayer
          </button>
        </div>
      )}

      {status === "loading" && orders.length === 0 ? (
        <p className="py-12 text-center text-sm text-gris">Chargement des commandes...</p>
      ) : (
        <div className="grid grid-cols-5 gap-4">
          {COLUMNS.map((column) => {
            const columnOrders = filteredOrders.filter((o) => column.statuses.includes(o.status));
            return (
              <div key={column.title} className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold text-nuit">
                    {column.emoji} {column.title}
                  </h3>
                  <span className="rounded-full bg-gris-light px-2 py-0.5 text-xs font-semibold text-gris">
                    {columnOrders.length}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {columnOrders.length === 0 ? (
                    <div className="rounded border-2 border-dashed border-gris-light p-6 text-center text-xs text-gris">
                      Aucune commande
                    </div>
                  ) : (
                    columnOrders.map((order) => {
                      const statusMeta = ORDER_STATUS_LABELS[order.status];
                      const clientName = order.client?.user
                        ? `${order.client.user.firstName} ${order.client.user.lastName}`
                        : "—";
                      return (
                        <div
                          key={order.id}
                          className="rounded bg-white p-3 shadow-sm"
                          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-sm font-semibold text-nuit">{order.orderNumber}</span>
                            <span
                              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                              style={{ backgroundColor: statusMeta.bg, color: statusMeta.text }}
                            >
                              {statusMeta.label}
                            </span>
                          </div>
                          <p className="truncate text-xs text-gris">{order.pro?.businessName ?? "Commerçant inconnu"}</p>
                          <p className="truncate text-xs text-gris">
                            {clientName}
                            {order.toAddress?.city ? ` · ${order.toAddress.city}` : ""}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-sm font-bold text-nuit">{Number(order.total).toFixed(2)} €</span>
                            <span className="text-[11px] text-gris">{formatPlacedAt(order.placedAt)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
