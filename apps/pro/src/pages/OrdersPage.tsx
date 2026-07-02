import React, { useEffect } from "react";
import { OrderStatus } from "@golfeexpress/types";
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

export function OrdersPage() {
  const orders = useProOrdersStore((s) => s.orders);
  const status = useProOrdersStore((s) => s.status);
  const error = useProOrdersStore((s) => s.error);
  const loadOrders = useProOrdersStore((s) => s.loadOrders);
  const advanceStatus = useProOrdersStore((s) => s.advanceStatus);
  const cancelOrder = useProOrdersStore((s) => s.cancelOrder);

  useEffect(() => {
    loadOrders();
    // Rafraîchit la liste toutes les 15s pour voir apparaître les nouvelles
    // commandes sans recharger la page. TODO: remplacer par une
    // souscription Supabase Realtime (postgres_changes sur Order, filter
    // proId=eq.<idDuPro>) — voir apps/api/REALTIME.md.
    const interval = setInterval(loadOrders, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 p-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold text-nuit">Commandes</h1>
        <p className="text-sm text-gris">Gérez vos commandes en temps réel</p>
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
            const columnOrders = orders.filter((o) => column.statuses.includes(o.status));
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
                      <ProOrderCard key={order.id} order={order} onAdvance={advanceStatus} onCancel={cancelOrder} />
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
