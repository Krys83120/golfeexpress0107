import React, { useEffect, useState } from "react";
import { OrderStatus, type Order } from "@golfeexpress/types";

interface ActiveDeliveriesCardProps {
  orders: Order[];
}

const ACTIVE_STATUSES: OrderStatus[] = [OrderStatus.RIDER_ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.IN_DELIVERY];

const STEP_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.RIDER_ASSIGNED]: "En route vers le commerçant",
  [OrderStatus.PICKED_UP]: "Récupérée",
  [OrderStatus.IN_DELIVERY]: "En route vers le client",
} as Record<OrderStatus, string>;

// Seuils de couleur pour le chrono, en minutes -- indicateur de fiabilité
// pour repérer d'un coup d'œil les livreurs qui traînent. Purement
// indicatif pour l'instant (pas de temps de trajet réel pris en compte) ;
// à ajuster si trop de faux positifs en usage réel.
const WARN_THRESHOLD_MIN = 20;
const LATE_THRESHOLD_MIN = 35;

function elapsedMinutes(riderAssignedAt: string): number {
  return Math.max(0, (Date.now() - new Date(riderAssignedAt).getTime()) / 60000);
}

function formatElapsed(riderAssignedAt: string): string {
  const totalSec = Math.max(0, Math.floor((Date.now() - new Date(riderAssignedAt).getTime()) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function chronoColor(minutes: number): string {
  if (minutes >= LATE_THRESHOLD_MIN) return "#F44336";
  if (minutes >= WARN_THRESHOLD_MIN) return "#FF6B35";
  return "#2ECC71";
}

/**
 * Carte "Livraisons en cours" du dashboard Admin -- liste, pour chaque
 * commande actuellement chez un livreur (RIDER_ASSIGNED/PICKED_UP/
 * IN_DELIVERY), un chrono en direct depuis order.riderAssignedAt (le
 * moment où CE livreur a pris la commande -- voir prisma/schema.prisma).
 *
 * Sert d'indicateur de fiabilité livreur en un coup d'œil : trié du plus
 * long chrono au plus court pour faire remonter en premier les livraisons
 * qui traînent. Les données commandes viennent de useAdminOrdersStore
 * (déjà rafraîchies toutes les 15s par DashboardPage) ; seul le chrono
 * affiché est recalculé chaque seconde ici, localement.
 */
export function ActiveDeliveriesCard({ orders }: ActiveDeliveriesCardProps) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const activeDeliveries = orders
    .filter((o) => ACTIVE_STATUSES.includes(o.status) && !!o.riderAssignedAt)
    .sort((a, b) => elapsedMinutes(b.riderAssignedAt as string) - elapsedMinutes(a.riderAssignedAt as string));

  return (
    <div className="mb-6 rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-heading text-base font-bold text-nuit">
          🛵 Livraisons en cours — chronos livreurs {activeDeliveries.length > 0 ? `(${activeDeliveries.length})` : ""}
        </h3>
        <span className="text-xs text-gris">Repère la fiabilité livreur (retards) en direct</span>
      </div>

      {activeDeliveries.length === 0 ? (
        <div className="flex flex-col items-center py-8">
          <span className="text-3xl">🦎</span>
          <p className="mt-2 text-sm text-gris">Aucune livraison en cours actuellement</p>
        </div>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gris-light text-xs uppercase tracking-wide text-gris">
              <th className="py-2 pr-4 font-medium">Livreur</th>
              <th className="py-2 pr-4 font-medium">Commande</th>
              <th className="py-2 pr-4 font-medium">Étape</th>
              <th className="py-2 pr-4 font-medium">Chrono</th>
            </tr>
          </thead>
          <tbody>
            {activeDeliveries.map((order) => {
              const riderName = order.rider?.user
                ? `${order.rider.user.firstName} ${order.rider.user.lastName}`
                : "Livreur";
              const minutes = elapsedMinutes(order.riderAssignedAt as string);
              const color = chronoColor(minutes);
              return (
                <tr key={order.id} className="border-b border-gris-light last:border-0">
                  <td className="py-3 pr-4 text-sm font-semibold text-nuit">{riderName}</td>
                  <td className="py-3 pr-4">
                    <p className="text-sm text-nuit">{order.orderNumber}</p>
                    <p className="text-xs text-gris">
                      {order.pro?.businessName ?? "Commerçant"}
                      {order.toAddress?.city ? ` → ${order.toAddress.city}` : ""}
                    </p>
                  </td>
                  <td className="py-3 pr-4 text-sm text-gris">{STEP_LABELS[order.status] ?? order.status}</td>
                  <td className="py-3 pr-4">
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-bold"
                      style={{ backgroundColor: `${color}1A`, color }}
                    >
                      🕐 {formatElapsed(order.riderAssignedAt as string)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
