import React, { useState } from "react";
import { Phone, MapPin, Clock, Printer, Receipt, Flag } from "lucide-react";
import { OrderStatus, OrderReportCategory, type Order } from "@golfeexpress/types";
import { getNextStatus, NEXT_ACTION_LABELS } from "@/services/orderStatusFlow";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { printOrderLabel } from "@/services/printLabel";
import { apiFetchBlob } from "@/services/apiClient";
import { createReport } from "@/services/reportsApi";
import { useAuthStore } from "@/store/useAuthStore";

const REPORT_CATEGORY_OPTIONS: Array<{ value: OrderReportCategory; label: string }> = [
  { value: "STOCK_UNAVAILABLE" as OrderReportCategory, label: "Rupture de stock" },
  { value: "CLIENT_UNREACHABLE" as OrderReportCategory, label: "Client injoignable" },
  { value: "TECHNICAL_ISSUE" as OrderReportCategory, label: "Problème technique" },
  { value: "OTHER" as OrderReportCategory, label: "Autre" },
];

interface ProOrderCardProps {
  order: Order;
  onAdvance: (orderId: string, nextStatus: OrderStatus, estimatedPrepMinutes?: number) => void;
  onMarkReady: (orderId: string) => void;
  onCancel: (orderId: string) => void;
}

const PREP_TIME_PRESETS = [10, 15, 20, 30];

function formatElapsed(isoDate: string): string {
  const minutes = Math.round((Date.now() - new Date(isoDate).getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  return `il y a ${Math.round(minutes / 60)}h`;
}

function formatEstimatedReady(preparingStartedAt: string, estimatedPrepMinutes: number): string {
  const readyAt = new Date(preparingStartedAt).getTime() + estimatedPrepMinutes * 60_000;
  const remainingMin = Math.round((readyAt - Date.now()) / 60_000);
  if (remainingMin <= 0) return "devrait être prête";
  return `prête dans ~${remainingMin} min`;
}

export function ProOrderCard({ order, onAdvance, onMarkReady, onCancel }: ProOrderCardProps) {
  const [showPrepPicker, setShowPrepPicker] = useState(false);
  const [customPrepMinutes, setCustomPrepMinutes] = useState("");
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  // Signalement d'un problème sur cette commande (rupture de stock, client
  // injoignable...) — indépendant du flux de statut, envoyé à l'admin qui
  // peut répondre directement depuis son compte (voir ReportsPage.tsx admin).
  const [showReportPanel, setShowReportPanel] = useState(false);
  const [reportCategory, setReportCategory] = useState<OrderReportCategory | null>(null);
  const [reportMessage, setReportMessage] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  // Temps de préparation habituel réglé dans les Paramètres — juste utilisé
  // pour pré-signaler visuellement le palier recommandé ci-dessous, ne
  // présélectionne/ne force jamais un choix : le Pro reste libre d'estimer
  // au cas par cas selon la commande réelle (voir Pro.defaultPrepTimeMinutes).
  const defaultPrepMinutes = useAuthStore((s) => s.profile?.defaultPrepTimeMinutes) ?? 15;

  // Ticket PDF (justificatif) — même endpoint que côté Client, accessible
  // aussi au Pro pour ses propres archives/traçabilité comptable.
  async function handleDownloadReceipt() {
    setLoadingReceipt(true);
    try {
      const blob = await apiFetchBlob(`/api/orders/${order.id}/receipt`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ticket-${order.orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      alert("Impossible de récupérer le ticket pour le moment.");
    } finally {
      setLoadingReceipt(false);
    }
  }

  const nextStatus = getNextStatus(order.status);
  const actionLabel = NEXT_ACTION_LABELS[order.status];
  const canCancel = order.status === OrderStatus.PENDING || order.status === OrderStatus.CONFIRMED;
  const isTerminal = order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED;

  // Un livreur a été trouvé PENDANT la préparation (recherche anticipée) —
  // la commande n'est pas encore physiquement prête, mais un livreur est
  // déjà en route. Le Pro doit alors pouvoir signaler "c'est prêt" sans
  // repasser par une transition de statut classique (voir mark-ready côté API).
  const needsMarkReadyOnly = order.status === OrderStatus.RIDER_ASSIGNED && !order.readyAt;
  const isPreparingWithoutRiderYet = order.status === OrderStatus.PREPARING;

  function handleStartPreparing(minutes: number) {
    onAdvance(order.id, OrderStatus.PREPARING, minutes);
    setShowPrepPicker(false);
    setCustomPrepMinutes("");
  }

  async function handleSubmitReport() {
    if (!reportCategory) {
      setReportError("Merci de choisir une catégorie.");
      return;
    }
    if (!reportMessage.trim()) {
      setReportError("Merci de décrire le problème.");
      return;
    }
    setReportError(null);
    setReportSubmitting(true);
    try {
      await createReport({ orderId: order.id, category: reportCategory, message: reportMessage.trim() });
      setReportSubmitted(true);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Impossible d'envoyer le signalement pour le moment.");
    } finally {
      setReportSubmitting(false);
    }
  }

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

        {isPreparingWithoutRiderYet && order.preparingStartedAt && order.estimatedPrepMinutes && (
          <p className="font-medium text-corail">
            ⏱️ {formatEstimatedReady(order.preparingStartedAt, order.estimatedPrepMinutes)} · recherche de livreur en cours
          </p>
        )}
        {order.rider && !needsMarkReadyOnly && <p className="font-medium text-purple-600">🛵 Livreur assigné</p>}
        {needsMarkReadyOnly && (
          <p className="font-medium text-purple-600">🛵 Livreur en route — cliquez "Marquer prête" dès que c'est prêt</p>
        )}
      </div>

      {showPrepPicker && (
        <div className="mb-3 rounded-sm bg-gris-light p-3">
          <p className="mb-2 text-xs font-semibold text-nuit">Temps de préparation estimé ?</p>
          <div className="mb-2 flex flex-wrap gap-2">
            {PREP_TIME_PRESETS.map((minutes) => (
              <button
                key={minutes}
                onClick={() => handleStartPreparing(minutes)}
                title={minutes === defaultPrepMinutes ? "Temps habituel de votre boutique" : undefined}
                className={
                  "rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-nuit shadow-sm hover:bg-golfe-green hover:text-white " +
                  (minutes === defaultPrepMinutes ? "ring-2 ring-golfe-green" : "")
                }
              >
                {minutes} min{minutes === defaultPrepMinutes ? " ★" : ""}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={180}
              value={customPrepMinutes}
              onChange={(e) => setCustomPrepMinutes(e.target.value)}
              placeholder="Autre (min)"
              className="w-28 rounded-sm border border-gris-light px-2 py-1.5 text-xs"
            />
            <button
              onClick={() => {
                const minutes = Number(customPrepMinutes);
                if (minutes > 0) handleStartPreparing(minutes);
              }}
              disabled={!customPrepMinutes}
              className="rounded-sm bg-nuit px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              Valider
            </button>
            <button
              onClick={() => setShowPrepPicker(false)}
              className="text-xs font-semibold text-gris hover:text-nuit"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {showReportPanel && (
        <div className="mb-3 rounded-sm bg-orange-50 p-3">
          {reportSubmitted ? (
            <div className="flex flex-col items-center py-2 text-center">
              <p className="text-2xl">✅</p>
              <p className="mt-1 text-xs text-nuit">Signalement envoyé — notre équipe est prévenue.</p>
              <button onClick={() => setShowReportPanel(false)} className="mt-2 text-xs font-bold text-golfe-green">
                Fermer
              </button>
            </div>
          ) : (
            <>
              <p className="mb-2 text-xs font-semibold text-nuit">Signaler un problème</p>
              <div className="mb-2 flex flex-wrap gap-2">
                {REPORT_CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setReportCategory(opt.value)}
                    className={
                      "rounded-full border px-3 py-1 text-xs font-semibold " +
                      (reportCategory === opt.value
                        ? "border-corail bg-corail/10 text-corail"
                        : "border-gris-light bg-white text-gris")
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <textarea
                value={reportMessage}
                onChange={(e) => setReportMessage(e.target.value)}
                placeholder="Décrivez le problème..."
                rows={2}
                className="w-full rounded-sm border border-gris-light px-2 py-1.5 text-xs"
              />
              {reportError && <p className="mt-1.5 text-xs text-red-500">{reportError}</p>}
              <button
                onClick={handleSubmitReport}
                disabled={reportSubmitting}
                className="mt-2 rounded-sm bg-corail px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {reportSubmitting ? "Envoi..." : "Envoyer le signalement"}
              </button>
            </>
          )}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-gris-light pt-3">
        <p className="text-sm font-bold text-nuit">{Number(order.total).toFixed(2)} €</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => printOrderLabel(order)}
            title="Imprimer l'étiquette"
            className="flex items-center gap-1.5 rounded-sm border border-gris-light px-3 py-1.5 text-xs font-semibold text-gris hover:bg-gris-light"
          >
            <Printer size={13} /> Étiquette
          </button>
          <button
            onClick={() => {
              setShowReportPanel((v) => !v);
              setReportSubmitted(false);
            }}
            title="Signaler un problème"
            className="flex items-center gap-1.5 rounded-sm border border-gris-light px-3 py-1.5 text-xs font-semibold text-gris hover:bg-gris-light"
          >
            <Flag size={13} /> Signaler
          </button>
          {order.paymentStatus === "CAPTURED" && (
            <button
              onClick={handleDownloadReceipt}
              disabled={loadingReceipt}
              title="Télécharger le ticket"
              className="flex items-center gap-1.5 rounded-sm border border-gris-light px-3 py-1.5 text-xs font-semibold text-gris hover:bg-gris-light disabled:opacity-50"
            >
              <Receipt size={13} /> {loadingReceipt ? "..." : "Ticket"}
            </button>
          )}
          {!isTerminal && !showPrepPicker && (
            <div className="flex gap-2">
              {canCancel && (
                <button
                  onClick={() => onCancel(order.id)}
                  className="rounded-sm border border-gris-light px-3 py-1.5 text-xs font-semibold text-gris hover:bg-gris-light"
                >
                  Annuler
                </button>
              )}

              {needsMarkReadyOnly ? (
                <button
                  onClick={() => onMarkReady(order.id)}
                  className="rounded-sm bg-golfe-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-golfe-green-dark"
                >
                  ✅ Marquer prête
                </button>
              ) : order.status === OrderStatus.CONFIRMED ? (
                <button
                  onClick={() => setShowPrepPicker(true)}
                  className="rounded-sm bg-golfe-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-golfe-green-dark"
                >
                  Démarrer la préparation
                </button>
              ) : (
                nextStatus &&
                actionLabel && (
                  <button
                    onClick={() => onAdvance(order.id, nextStatus)}
                    className="rounded-sm bg-golfe-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-golfe-green-dark"
                  >
                    {actionLabel}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
