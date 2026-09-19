import React, { useEffect, useState } from "react";
import { X, Package2, User as UserIcon, MapPin, Bike, CreditCard } from "lucide-react";
import { ParcelOrderStatus, PaymentStatus, RiderStatus } from "@golfeexpress/types";
import type { AdminParcelOrderRow } from "@/services/parcelOrdersAdminApi";
import {
  reassignAdminParcelOrder,
  cancelAdminParcelOrder,
  markPaidAdminParcelOrder,
  deleteAdminParcelOrder,
} from "@/services/parcelOrdersAdminApi";
import { fetchAdminRiders, type AdminRiderRow } from "@/services/adminEntitiesApi";
import { PARCEL_ORDER_STATUS_LABELS, PARCEL_PAYMENT_BADGE_STYLES, getParcelPaymentBadgeTone, getParcelPaymentBadgeLabel } from "@/services/parcelOrderLabels";

/**
 * Modale détail + actions Admin pour une demande Colis Express (19/09/2026).
 * À la différence de OrderDetailModal.tsx (pure consultation, voir son
 * commentaire), celle-ci porte les 3 actions de gestion demandées par Krys :
 * réassigner/retirer le livreur, annuler, marquer payé manuellement -- voir
 * les règles exactes (statuts autorisés) dans les routes serveur associées.
 */
const REASSIGNABLE_STATUSES: ParcelOrderStatus[] = [
  ParcelOrderStatus.CONFIRMED,
  ParcelOrderStatus.RIDER_ASSIGNED,
  ParcelOrderStatus.PICKED_UP,
  ParcelOrderStatus.IN_DELIVERY,
];
const CANCELLABLE_STATUSES: ParcelOrderStatus[] = [
  ParcelOrderStatus.PENDING,
  ParcelOrderStatus.CONFIRMED,
  ParcelOrderStatus.RIDER_ASSIGNED,
  ParcelOrderStatus.PICKED_UP,
  ParcelOrderStatus.IN_DELIVERY,
];

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function riderName(p: AdminParcelOrderRow): string | null {
  if (!p.rider) return null;
  return `${p.rider.user.firstName} ${p.rider.user.lastName}`;
}

interface Props {
  parcelOrder: AdminParcelOrderRow;
  onClose: () => void;
  onUpdated: (updated: AdminParcelOrderRow) => void;
  /** Appelé après une suppression définitive (19/09/2026) -- pas de ligne "updated" à renvoyer, juste l'id à retirer côté liste. */
  onDeleted: (id: string) => void;
}

export function ParcelOrderAdminModal({ parcelOrder, onClose, onUpdated, onDeleted }: Props) {
  const [current, setCurrent] = useState(parcelOrder);
  const [riders, setRiders] = useState<AdminRiderRow[]>([]);
  const [selectedRiderId, setSelectedRiderId] = useState<string>(current.riderId ?? "");
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState<"reassign" | "cancel" | "mark-paid" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminRiders()
      .then((rows) => setRiders(rows.filter((r) => r.status === RiderStatus.ACTIVE)))
      .catch(() => setRiders([]));
  }, []);

  const statusMeta = PARCEL_ORDER_STATUS_LABELS[current.status];
  const paymentTone = getParcelPaymentBadgeTone(current);
  const paymentStyle = PARCEL_PAYMENT_BADGE_STYLES[paymentTone];
  const canReassign = REASSIGNABLE_STATUSES.includes(current.status);
  const canCancel = CANCELLABLE_STATUSES.includes(current.status);
  const canMarkPaid = current.status !== ParcelOrderStatus.CANCELLED && current.paymentStatus !== PaymentStatus.CAPTURED;
  // Suppression définitive (19/09/2026, retour de Krys) -- réservée aux
  // demandes déjà annulées, même règle que côté serveur (voir DELETE
  // /api/admin/parcel-orders) : jamais de suppression directe d'une course
  // active.
  const canDelete = current.status === ParcelOrderStatus.CANCELLED;

  function applyUpdate(updated: AdminParcelOrderRow) {
    setCurrent(updated);
    setSelectedRiderId(updated.riderId ?? "");
    onUpdated(updated);
  }

  async function handleReassign() {
    setError(null);
    setBusy("reassign");
    try {
      const updated = await reassignAdminParcelOrder(current.id, selectedRiderId || null);
      applyUpdate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la réassignation.");
    } finally {
      setBusy(null);
    }
  }

  async function handleCancel() {
    setError(null);
    setBusy("cancel");
    try {
      const updated = await cancelAdminParcelOrder(current.id);
      applyUpdate(updated);
      setConfirmingCancel(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'annulation.");
    } finally {
      setBusy(null);
    }
  }

  async function handleMarkPaid() {
    setError(null);
    setBusy("mark-paid");
    try {
      const updated = await markPaidAdminParcelOrder(current.id);
      applyUpdate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec du marquage comme payée.");
    } finally {
      setBusy(null);
    }
  }

  /** Suppression définitive (19/09/2026) -- réservée aux demandes déjà CANCELLED, voir canDelete ci-dessous. */
  async function handleDelete() {
    setError(null);
    setBusy("delete");
    try {
      await deleteAdminParcelOrder(current.id);
      onDeleted(current.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la suppression.");
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gris-light p-5">
          <div className="flex items-center gap-2">
            <Package2 size={20} className="text-corail" />
            <h2 className="font-heading text-lg font-extrabold text-nuit">{current.parcelNumber}</h2>
          </div>
          <button onClick={onClose} className="text-gris hover:text-nuit">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ backgroundColor: statusMeta.bg, color: statusMeta.text }}
            >
              {statusMeta.label}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ backgroundColor: paymentStyle.bg, color: paymentStyle.text }}
            >
              <CreditCard size={12} />
              {getParcelPaymentBadgeLabel(current)}
            </span>
          </div>

          {error && <div className="rounded-sm bg-red-50 p-3 text-sm text-red-500">{error}</div>}

          <div className="rounded bg-gris-light/40 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gris">
              🏪 Commerçant
            </p>
            <p className="text-sm font-semibold text-nuit">{current.pro?.businessName ?? "—"}</p>
          </div>

          <div className="rounded bg-gris-light/40 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gris">
              <UserIcon size={12} /> Destinataire
            </p>
            <p className="text-sm font-semibold text-nuit">{current.recipientName}</p>
            <p className="text-xs text-gris">{current.recipientPhone}</p>
          </div>

          <div className="rounded bg-gris-light/40 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gris">
              <MapPin size={12} /> Adresse de livraison
            </p>
            <p className="text-sm text-nuit">
              {current.toAddress?.street}
              {current.toAddress?.complement ? `, ${current.toAddress.complement}` : ""}
            </p>
            <p className="text-xs text-gris">
              {current.toAddress?.zipCode} {current.toAddress?.city}
            </p>
            {current.instructions && <p className="mt-1 text-xs italic text-gris">« {current.instructions} »</p>}
          </div>

          <div className="grid grid-cols-2 gap-3 rounded bg-gris-light/40 p-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gris">Gabarit</p>
              <p className="text-sm font-semibold text-nuit">{current.size}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gris">Total</p>
              <p className="text-sm font-bold text-nuit">{current.total.toFixed(2)} €</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gris">Part livreur</p>
              <p className="text-sm text-nuit">{current.riderEarnings.toFixed(2)} €</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gris">Part plateforme</p>
              <p className="text-sm text-nuit">{current.platformEarnings.toFixed(2)} €</p>
            </div>
          </div>

          <div className="rounded bg-gris-light/40 p-3 text-xs text-gris">
            <p>Placée le {formatDateTime(current.placedAt)}</p>
            {current.riderAssignedAt && <p>Livreur assigné le {formatDateTime(current.riderAssignedAt)}</p>}
            {current.pickedUpAt && <p>Récupérée le {formatDateTime(current.pickedUpAt)}</p>}
            {current.deliveredAt && <p>Livrée le {formatDateTime(current.deliveredAt)}</p>}
            {current.cancelledAt && <p>Annulée le {formatDateTime(current.cancelledAt)}</p>}
          </div>

          {/* Réassignation */}
          <div className="rounded border border-gris-light p-3">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-nuit">
              <Bike size={16} /> Livreur
            </p>
            {!canReassign ? (
              <p className="text-xs text-gris">
                {riderName(current) ?? "Aucun livreur assigné"} -- non modifiable dans cet état.
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  className="flex-1 rounded-sm border border-gris-light bg-white px-2 py-1.5 text-sm text-nuit"
                  value={selectedRiderId}
                  onChange={(e) => setSelectedRiderId(e.target.value)}
                >
                  <option value="">
                    {current.status === ParcelOrderStatus.CONFIRMED ? "Aucun livreur" : "-- retirer le livreur --"}
                  </option>
                  {riders.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.user.firstName} {r.user.lastName}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleReassign}
                  disabled={busy !== null || selectedRiderId === (current.riderId ?? "")}
                  className="rounded-sm bg-nuit px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {busy === "reassign" ? "..." : "Assigner"}
                </button>
              </div>
            )}
          </div>

          {/* Marquer payé */}
          {canMarkPaid && (
            <div className="rounded border border-gris-light p-3">
              <p className="mb-2 text-sm font-semibold text-nuit">💳 Paiement</p>
              <p className="mb-2 text-xs text-gris">
                Réservé au dépannage (paiement confirmé côté Stripe mais webhook non reçu, ou réglé par un autre moyen).
              </p>
              <button
                onClick={handleMarkPaid}
                disabled={busy !== null}
                className="rounded-sm border border-golfe-green px-3 py-1.5 text-xs font-semibold text-golfe-green transition-colors hover:bg-golfe-green hover:text-white disabled:opacity-40"
              >
                {busy === "mark-paid" ? "..." : "Marquer comme payée"}
              </button>
            </div>
          )}

          {/* Annulation */}
          {canCancel && (
            <div className="rounded border border-red-100 p-3">
              {!confirmingCancel ? (
                <button
                  onClick={() => setConfirmingCancel(true)}
                  className="text-xs font-semibold text-red-500 hover:underline"
                >
                  Annuler cette demande
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-nuit">
                    Confirmer l'annulation
                    {current.paymentStatus === PaymentStatus.CAPTURED ? " -- le Pro sera remboursé automatiquement." : " ?"}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancel}
                      disabled={busy !== null}
                      className="rounded-sm bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                      {busy === "cancel" ? "..." : "Confirmer l'annulation"}
                    </button>
                    <button
                      onClick={() => setConfirmingCancel(false)}
                      disabled={busy !== null}
                      className="rounded-sm border border-gris-light px-3 py-1.5 text-xs font-semibold text-nuit"
                    >
                      Retour
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Suppression définitive (19/09/2026) */}
          {canDelete && (
            <div className="rounded border border-red-100 p-3">
              {!confirmingDelete ? (
                <button
                  onClick={() => setConfirmingDelete(true)}
                  className="text-xs font-semibold text-red-500 hover:underline"
                >
                  Supprimer définitivement cette demande
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-nuit">
                    Confirmer la suppression définitive -- action irréversible.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={busy !== null}
                      className="rounded-sm bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                      {busy === "delete" ? "..." : "Confirmer la suppression"}
                    </button>
                    <button
                      onClick={() => setConfirmingDelete(false)}
                      disabled={busy !== null}
                      className="rounded-sm border border-gris-light px-3 py-1.5 text-xs font-semibold text-nuit"
                    >
                      Retour
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
