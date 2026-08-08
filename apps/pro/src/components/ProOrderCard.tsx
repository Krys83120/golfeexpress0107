import React from "react";
import { Phone, MapPin, Clock } from "lucide-react";
import { OrderStatus, type Order } from "@golfeexpress/types";
import { getNextStatus, NEXT_ACTION_LABELS } from "@/services/orderStatusFlow";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

interface ProOrderCardProps {
  order: Order;
  onAdvance: (orderId: string, nextStatus: OrderStatus) => void;
  onCancel: (orderId: string) => void;
}

function formatElapsed(isoDate: string): string {
  const minutes = Math.round((Date.now() - new Date(isoDate).getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  return `il y a ${Math.round(minutes / 60)}h`;
}

export function ProOrderCard({ order, onAdvance, onCancel }: ProOrderCardProps) {
  const nextStatus = getNextStatus(order.status);
  const actionLabel = NEXT_ACTION_LABELS[order.status];
  const canCancel = order.status === OrderStatus.PENDING || order.status === OrderStatus.CONFIRMED;
  const isTerminal = order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED;

  return (
    <div className="rounded bg-white p-4 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="font-heading text-sm font-bold text-nuit">{order.orderNumber}</p>
          <p className="text-xs text-gris">
            {order.client?.user?.firstName} {order.client?.user?.lastName}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mb-3 flex flex-col gap-1">
        {order.items?.map((item) => (
          <p key={item.id} className="text-sm text-nuit">
            <span className="font-semibold">{item.quantity}x</span> {item.productName}
          </p>
        ))}
      </div>

      {order.clientNote && (
        <p className="mb-3 rounded-sm bg-orange-50 px-2.5 py-1.5 text-xs text-corail">📝 {order.clientNote}</p>
      )}

      <div className="mb-3 flex flex-col gap-1.5 border-t border-gris-light pt-3 text-xs text-gris">
        <div className="flex items-center gap-1.5">
          <MapPin size={12} />
          <span className="truncate">
            {order.toAddress?.street}, {order.toAddress?.city}
          </span>
        </div>
        {order.client?.user?.phone && (
          <div className="flex items-center gap-1.5">
            <Phone size={12} />
            <span>{order.client.user.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Clock size={12} />
          <span>{formatElapsed(order.placedAt)}</span>
        </div>
        {order.rider && <p className="font-medium text-purple-600">🛵 Livreur assigné</p>}
      </div>

      <div className="flex items-center justify-between border-t border-gris-light pt-3">
        <p className="text-sm font-bold text-nuit">{Number(order.total).toFixed(2)} €</p>
        {!isTerminal && (
          <div className="flex gap-2">
            {canCancel && (
              <button
                onClick={() => onCancel(order.id)}
                className="rounded-sm border border-gris-light px-3 py-1.5 text-xs font-semibold text-gris hover:bg-gris-light"
              >
                Annuler
              </button>
            )}
            {nextStatus && actionLabel && (
              <button
                onClick={() => onAdvance(order.id, nextStatus)}
                className="rounded-sm bg-golfe-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-golfe-green-dark"
              >
                {actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
