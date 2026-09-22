import React, { useEffect, useState } from "react";
import { X, FlaskConical } from "lucide-react";
import { OrderStatus, PaymentStatus, type Order } from "@golfeexpress/types";
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
import { markOrderAsTest, testTransitionOrder } from "@/services/ordersApi";
import { useAdminOrdersStore } from "@/store/useAdminOrdersStore";
import { ApiRequestError } from "@/services/apiClient";

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
}

// Même cycle simplifié que le serveur (voir
// admin/orders/[orderId]/test-transition/route.ts, TEST_FLOW) -- fusionne
// RIDER_ASSIGNED/PICKED_UP dans IN_DELIVERY pour ce bouton de test.
const TEST_FLOW: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.IN_DELIVERY,
  OrderStatus.DELIVERED,
];

const NEXT_STEP_LABEL: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.CONFIRMED]: "Marquer payée (test)",
  [OrderStatus.PREPARING]: "Démarrer la préparation (test)",
  [OrderStatus.READY]: "Marquer prête (test)",
  [OrderStatus.IN_DELIVERY]: "Marquer en livraison (test)",
  [OrderStatus.DELIVERED]: "Marquer terminée (test)",
};

/**
 * Détail traçabilité d'une commande : qui a commandé, qui a préparé, qui a
 * livré, à quelle adresse, et le temps pris par chaque étape -- toutes ces
 * données proviennent déjà de GET /api/orders (aucun appel réseau
 * supplémentaire), voir orderTraceability.ts pour le calcul des durées.
 *
 * MODE TEST (ajout du 22/09/2026, demande de Krys) : une commande encore
 * PENDING/impayée peut être marquée "commande de test", puis avancée
 * manuellement étape par étape (payée -> préparation -> prête -> en
 * livraison -> terminée) pour tester les notifications (email Pro/Client +
 * push Rider) sans jamais engager de vrai paiement ni fausser le CA -- voir
 * apps/api/src/app/api/admin/orders/[orderId]/{mark-test,test-transition}/
 * route.ts pour toutes les garanties de sécurité.
 */
export function OrderDetailModal({ order, onClose }: OrderDetailModalProps) {
  const [localOrder, setLocalOrder] = useState(order);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const updateOrderLocally = useAdminOrdersStore((s) => s.updateOrderLocally);

  // Réinitialise l'état local si l'admin ouvre une AUTRE commande depuis le
  // Kanban pendant que ce composant reste monté (OrdersPage ne remonte pas
  // la modale à chaque sélection, voir OrdersPage.tsx).
  useEffect(() => {
    setLocalOrder(order);
    setActionError(null);
  }, [order]);

  function applyUpdate(updated: Order) {
    setLocalOrder(updated);
    updateOrderLocally(updated);
  }

  async function handleToggleTest(next: boolean) {
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await markOrderAsTest(localOrder.id, next);
      applyUpdate(updated);
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : "Action impossible.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleNextTestStep() {
    const currentIndex = TEST_FLOW.indexOf(localOrder.status);
    const nextStatus = currentIndex >= 0 ? TEST_FLOW[currentIndex + 1] : undefined;
    if (!nextStatus) return;

    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await testTransitionOrder(localOrder.id, nextStatus);
      applyUpdate(updated);
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : "Action impossible.");
    } finally {
      setActionLoading(false);
    }
  }

  const steps = buildTraceSteps(localOrder);
  const statusMeta = ORDER_STATUS_LABELS[localOrder.status];
  const total = totalDurationMs(localOrder);

  // Case à cocher "commande de test" visible uniquement tant que rien de
  // réel ne s'est encore produit (même garde-fou que côté serveur, voir
  // mark-test/route.ts) -- une fois payée/avancée, plus question de
  // basculer son statut de test.
  //
  // CORRECTIF du 22/09/2026 : n'exige plus paymentStatus === PENDING au
  // sens strict (Stripe fait passer une vraie commande de PENDING à
  // AUTHORIZED en quelques secondes, bien avant que Krys n'ait le temps
  // d'ouvrir la commande -- la case ne s'affichait donc quasiment jamais en
  // pratique). Seul paymentStatus === CAPTURED (argent réellement encaissé)
  // doit bloquer, voir mark-test/route.ts pour le raisonnement complet.
  const canToggleTest = localOrder.status === OrderStatus.PENDING && localOrder.paymentStatus !== PaymentStatus.CAPTURED;
  const nextTestStatus = TEST_FLOW[TEST_FLOW.indexOf(localOrder.status) + 1];

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
            <h2 className="font-heading text-lg font-extrabold text-nuit">{localOrder.orderNumber}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span
                className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: statusMeta.bg, color: statusMeta.text }}
              >
                {statusMeta.label}
              </span>
              <PaymentStatusBadge order={localOrder} />
              {localOrder.isTest && (
                <span className="inline-flex items-center gap-1 rounded-full bg-nuit px-2 py-0.5 text-[11px] font-semibold text-white">
                  <FlaskConical size={11} /> TEST
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded-sm p-1 text-gris hover:bg-gris-light">
            <X size={20} />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 rounded-sm bg-gris-light/60 p-3 text-xs">
          <div>
            <p className="text-gris">Client</p>
            <p className="font-semibold text-nuit">{clientDisplayName(localOrder)}</p>
          </div>
          <div>
            <p className="text-gris">Commerçant</p>
            <p className="font-semibold text-nuit">{localOrder.pro?.businessName ?? "—"}</p>
          </div>
          <div>
            <p className="text-gris">Livreur</p>
            <p className="font-semibold text-nuit">{riderDisplayName(localOrder)}</p>
          </div>
          <div>
            <p className="text-gris">Total</p>
            <p className="font-semibold text-nuit">{Number(localOrder.total).toFixed(2)} €</p>
          </div>
          <div className="col-span-2">
            <p className="text-gris">Adresse de livraison</p>
            <p className="font-semibold text-nuit">{deliveryAddressLabel(localOrder)}</p>
          </div>
          <div className="col-span-2">
            <p className="text-gris">Durée totale (commande → livraison)</p>
            <p className="font-semibold text-nuit">{formatDuration(total)}</p>
          </div>
        </div>

        {(canToggleTest || localOrder.isTest) && (
          <div className="mb-5 rounded-sm border border-dashed border-nuit/30 bg-nuit/[0.03] p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-nuit">
              <FlaskConical size={13} /> Mode test
            </div>

            {canToggleTest && (
              <label className="flex items-center gap-2 text-xs text-nuit">
                <input
                  type="checkbox"
                  checked={localOrder.isTest}
                  disabled={actionLoading}
                  onChange={(e) => handleToggleTest(e.target.checked)}
                />
                Marquer comme commande de test (aucun paiement réel ne sera demandé)
              </label>
            )}

            {localOrder.isTest && (
              <div className="mt-2">
                {nextTestStatus ? (
                  <button
                    onClick={handleNextTestStep}
                    disabled={actionLoading}
                    className="rounded-sm bg-nuit px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {actionLoading ? "…" : NEXT_STEP_LABEL[nextTestStatus]}
                  </button>
                ) : (
                  <p className="text-xs text-gris">Cette commande de test a atteint sa dernière étape.</p>
                )}
                <p className="mt-1.5 text-[11px] text-gris">
                  Envoie les mêmes notifications (email Pro/Client, push Livreur) que le vrai flux, sans jamais
                  toucher à Stripe ni compter dans le CA.
                </p>
              </div>
            )}

            {actionError && <p className="mt-2 text-xs text-red-500">{actionError}</p>}
          </div>
        )}

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
