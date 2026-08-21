import React, { useEffect, useMemo, useState } from "react";
import { OrderStatus, type Order } from "@golfeexpress/types";
import { useProOrdersStore } from "@/store/useProOrdersStore";
import { ProOrderCard } from "@/components/ProOrderCard";

interface KanbanColumn {
  title: string;
  emoji: string;
  statuses: OrderStatus[];
}

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

/** Clé de jour locale (YYYY-MM-DD) — pas UTC, pour regrouper comme le Pro le voit à l'écran. */
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
  const orders = useProOrdersStore((s) => s.orders);
  const status = useProOrdersStore((s) => s.status);
  const error = useProOrdersStore((s) => s.error);
  const loadOrders = useProOrdersStore((s) => s.loadOrders);
  const advanceStatus = useProOrdersStore((s) => s.advanceStatus);
  const markReady = useProOrdersStore((s) => s.markReady);
  const cancelOrder = useProOrdersStore((s) => s.cancelOrder);

  // Filtres -- par défaut on n'affiche que le jour le plus récent présent
  // dans les données (généralement "aujourd'hui") pour ne pas saturer la
  // page avec tout l'historique d'un coup, comme demandé. La ville reste en
  // "Toutes" par défaut. Pas de filtre "commerçant" ici : cette page est
  // déjà scopée à la boutique du Pro connecté (contrairement à la vue admin
  // qui couvre toute la plateforme).
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>(ALL);

  useEffect(() => {
    // Le chargement initial + le rafraîchissement périodique sont gérés au
    // niveau racine de l'app (voir App.tsx) pour continuer même quand
    // cette page n'est pas affichée — pas besoin de dupliquer ici.
    if (status === "idle") loadOrders();
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
    const cities = new Set(orders.map((o) => o.toAddress?.city).filter((c): c is string => !!c));
    return Array.from(cities).sort((a, b) => a.localeCompare(b, "fr"));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o: Order) => {
      if (selectedDay && selectedDay !== ALL && dayKey(o.placedAt) !== selectedDay) return false;
      if (selectedCity !== ALL && o.toAddress?.city !== selectedCity) return false;
      return true;
    });
  }, [orders, selectedDay, selectedCity]);

  const selectClass =
    "rounded-sm border border-gris-light bg-white px-3 py-2 text-sm text-nuit focus:border-golfe-green focus:outline-none";

  return (
    <div className="flex-1 p-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold text-nuit">Commandes</h1>
        <p className="text-sm text-gris">Gérez vos commandes en temps réel</p>
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

        {((selectedDay && selectedDay !== ALL) || selectedCity !== ALL) && (
          <button
            onClick={() => {
              setSelectedDay(ALL);
              setSelectedCity(ALL);
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
                    columnOrders.map((order) => (
                      <ProOrderCard
                        key={order.id}
                        order={order}
                        onAdvance={advanceStatus}
                        onMarkReady={markReady}
                        onCancel={cancelOrder}
                      />
                    ))
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
