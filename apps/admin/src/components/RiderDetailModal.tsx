import React, { useState } from "react";
import { X, Star } from "lucide-react";
import type { VehicleType, RiderStatus } from "@golfeexpress/types";
import { RIDER_STATUS_LABELS, ADMIN_VEHICLE_LABELS } from "@/services/riderLabels";
import { updateAdminRider, type AdminRiderRow } from "@/services/adminEntitiesApi";
import { MapView, type MapPin } from "@/components/MapView";

interface RiderDetailModalProps {
  rider: AdminRiderRow;
  onClose: () => void;
  onUpdated: (updated: AdminRiderRow) => void;
}

export function RiderDetailModal({ rider, onClose, onUpdated }: RiderDetailModalProps) {
  const [vehicleType, setVehicleType] = useState<VehicleType>(rider.vehicleType);
  const [vehiclePlate, setVehiclePlate] = useState(rider.vehiclePlate ?? "");
  const [status, setStatus] = useState<RiderStatus>(rider.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rating = rider.rating ? Number(rider.rating) : null;

  const pins: MapPin[] =
    rider.isOnline && rider.currentLat !== null && rider.currentLng !== null
      ? [
          {
            id: rider.id,
            lat: Number(rider.currentLat),
            lng: Number(rider.currentLng),
            label: ADMIN_VEHICLE_LABELS[rider.vehicleType].emoji,
            color: "#2ECC71",
            popupContent: `${rider.user.firstName} ${rider.user.lastName}`,
          },
        ]
      : [];

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateAdminRider(rider.id, {
        vehicleType,
        vehiclePlate: vehiclePlate.trim() || null,
        status,
      });
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer les modifications.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gris-light text-sm font-bold text-nuit">
              {rider.user.firstName[0]}
              {rider.user.lastName[0]}
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-nuit">
                {rider.user.firstName} {rider.user.lastName}
              </h2>
              <p className="text-xs text-gris">{rider.user.email}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-gris-light">
            <X size={18} />
          </button>
        </div>

        <div className="mb-5 flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: rider.isOnline ? "#2ECC71" : "#D1D5DB" }} />
            {rider.isOnline ? "En ligne" : "Hors ligne"}
          </span>
          {rating && rider.ratingCount > 0 && (
            <span className="flex items-center gap-1 text-nuit">
              <Star size={13} fill="#FF6B35" color="#FF6B35" />
              {rating.toFixed(1)} <span className="text-xs text-gris">({rider.ratingCount})</span>
            </span>
          )}
          <span className="text-gris">{rider.totalDeliveries} livraisons</span>
          <span className="font-semibold text-nuit">{Number(rider.totalEarnings).toFixed(2)} €</span>
        </div>

        <div className="mb-5">
          <label className="mb-1.5 block text-xs font-semibold text-gris">Position actuelle</label>
          <MapView pins={pins} height={200} emptyLabel="Livreur hors ligne — pas de position en direct" />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gris">Véhicule</label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value as VehicleType)}
              className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
            >
              {Object.entries(ADMIN_VEHICLE_LABELS).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.emoji} {meta.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gris">Plaque</label>
            <input
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.target.value)}
              placeholder="Ex: AB-123-CD"
              className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-xs font-semibold text-gris">Statut</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as RiderStatus)}
            className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
          >
            {Object.entries(RIDER_STATUS_LABELS).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
        </div>

        {error && <div className="mb-4 rounded-sm bg-red-50 p-3 text-sm text-red-500">{error}</div>}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-gris-light px-4 py-2 text-sm font-semibold text-gris"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-sm bg-golfe-green px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
