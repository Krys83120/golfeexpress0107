import React from "react";
import { OrderStatus, type Order } from "@golfeexpress/types";

interface StatusBucket {
  key: string;
  label: string;
  emoji: string;
  statuses: OrderStatus[];
  color: string;
}

// Mêmes regroupements que le Kanban de apps/pro/src/pages/OrdersPage.tsx,
// pour rester cohérent entre les deux apps — et reprend exactement les
// quatre états demandés (en cours, en préparation, en livraison, terminées).
const BUCKETS: StatusBucket[] = [
  { key: "new", label: "Nouvelles", emoji: "🆕", statuses: [OrderStatus.PENDING, OrderStatus.CONFIRMED], color: "#FF6B35" },
  { key: "preparing", label: "En préparation", emoji: "👨‍🍳", statuses: [OrderStatus.PREPARING], color: "#FF6B35" },
  { key: "ready", label: "Prêtes", emoji: "✅", statuses: [OrderStatus.READY], color: "#2196F3" },
  {
    key: "delivering",
    label: "En livraison",
    emoji: "🛵",
    statuses: [OrderStatus.RIDER_ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.IN_DELIVERY],
    color: "#9C27B0",
  },
  { key: "done", label: "Terminées", emoji: "🏁", statuses: [OrderStatus.DELIVERED, OrderStatus.CANCELLED], color: "#2ECC71" },
];

interface OrderStatusSummaryProps {
  orders: Order[];
  onViewAll?: () => void;
}

export function OrderStatusSummary({ orders, onViewAll }: OrderStatusSummaryProps) {
  return (
    <div className="mb-6 rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-heading text-base font-bold text-nuit">🧾 Commandes par statut</h3>
        {onViewAll && (
          <button onClick={onViewAll} className="text-sm font-semibold text-golfe-green">
            Voir tout
          </button>
        )}
      </div>

      {orders.length === 0 ? (
        <p className="py-6 text-center text-sm text-gris">Aucune commande pour le moment.</p>
      ) : (
        <div className="grid grid-cols-5 gap-4">
          {BUCKETS.map((bucket) => {
            const count = orders.filter((o) => bucket.statuses.includes(o.status)).length;
            return (
              <button
                key={bucket.key}
                onClick={onViewAll}
                className="flex flex-col items-center gap-1 rounded-sm py-4 transition-colors hover:bg-gris-light/50"
                style={{ backgroundColor: `${bucket.color}0D` }}
              >
                <span className="text-2xl">{bucket.emoji}</span>
                <span className="font-heading text-xl font-extrabold" style={{ color: bucket.color }}>
                  {count}
                </span>
                <span className="text-xs text-gris">{bucket.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}