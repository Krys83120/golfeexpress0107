import React from "react";
import { X } from "lucide-react";
import type { Order } from "@golfeexpress/types";
import {
  buildTraceSteps,
  formatDuration,
  totalDurationMs,
  clientDisplayName,
  riderDisplayName,
  deliveryAddressLabel,
} from "@/services/orderTraceability";
import { ORDER_STATUS_LABELS } from "@/services/orderStatusLabels";
import { PaymentStatusBadge } from "@/components/PaymentStatusBadge";

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
}

/**
 * Détail traçabilité d'une commande : qui a commandé, qui a préparé, qui a
 * livré, à quelle adresse, et le temps pris par chaque étape -- toutes ces
 * données proviennent déjà de GET /api/orders (aucun appel réseau
 * supplémentaire), voir orderTraceability.ts pour le calcul des durées.
 */
export function OrderDetailModal({ order, onClose }: OrderDetailModalProps) {
  const steps = buildTraceSteps(order);
  const statusMeta = ORDER_STATUS_LABELS[order.status];
  const total = totalDurationMs(order);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-sm bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-heading text-lg font-extrabold text-nuit">{order.orderNumber}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span
                className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: statusMeta.bg, color: statusMeta.text }}
              >
                {statusMeta.label}
              </span>
              <PaymentStatusBadge order={order} />
            </div>
          </div>
          <button onClick={onClose} className="rounded-sm p-1 text-gris hover:bg-gris-light">
            <X size={20} />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 rounded-sm bg-gris-light/60 p-3 text-xs">
          <div>
            <p className="text-gris">Client</p>
            <p className="font-semibold text-nuit">{clientDisplayName(order)}</p>
          </div>
          <div>
            <p className="text-gris">Commerçant</p>
            <p className="font-semibold text-nuit">{order.pro?.businessName ?? "—"}</p>
          </div>
          <div>
            <p className="text-gris">Livreur</p>
            <p className="font-semibold text-nuit">{riderDisplayName(order)}</p>
          </div>
          <div>
            <p className="text-gris">Total</p>
            <p className="font-semibold text-nuit">{Number(order.total).toFixed(2)} €</p>
          </div>
          <div className="col-span-2">
            <p className="text-gris">Adresse de livraison</p>
            <p className="font-semibold text-nuit">{deliveryAddressLabel(order)}</p>
          </div>
          <div className="col-span-2">
            <p className="text-gris">Durée totale (commande → livraison)</p>
            <p className="font-semibold text-nuit">{formatDuration(total)}</p>
          </div>
        </div>

        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gris">Chronologie</h3>
        <div className="flex flex-col gap-0">
          {steps.map((step, idx) => (
            <div key={step.label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: step.at ? "#2ECC71" : "#E0E0E0" }}
                />
                {idx < steps.length - 1 && <div className="w-px flex-1" style={{ backgroundColor: "#E0E0E0" }} />}
              </div>
              <div className="pb-4">
                <p className="text-sm font-medium" style={{ color: step.at ? "#1A1A2E" : "#B0B0B0" }}>
                  {step.label}
                </p>
                {step.at ? (
                  <p className="text-xs text-gris">
                    {new Date(step.at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {step.durationMs !== null ? ` · +${formatDuration(step.durationMs)}` : ""}
                  </p>
                ) : (
                  <p className="text-xs text-gris">Pas encore atteinte</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
