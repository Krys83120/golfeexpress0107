import React, { useEffect, useState } from "react";
import { X, Star, CheckCircle2, XCircle } from "lucide-react";
import type { VehicleType, RiderStatus, Review } from "@golfeexpress/types";
import { RIDER_STATUS_LABELS, ADMIN_VEHICLE_LABELS } from "@/services/riderLabels";
import { updateAdminRider, fetchAdminRiderReviews, type AdminRiderRow } from "@/services/adminEntitiesApi";
import { validateRider } from "@/services/validationsApi";
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
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsStatus, setReviewsStatus] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setReviewsStatus("loading");
    fetchAdminRiderReviews(rider.id)
      .then((data) => {
        if (!cancelled) {
          setReviews(data);
          setReviewsStatus("loaded");
        }
      })
      .catch(() => {
        if (!cancelled) setReviewsStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [rider.id]);

  const missingProfilePhoto = !rider.profilePhotoUrl;

  async function handleValidate() {
    if (missingProfilePhoto) {
      setError("Impossible de valider : ce livreur n'a pas encore fourni de photo de profil (obligatoire).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await validateRider(rider.id, true);
      setStatus(updated.status);
      onUpdated(updated as AdminRiderRow);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de valider ce dossier.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    setSaving(true);
    setError(null);
    try {
      const updated = await validateRider(rider.id, false, rejectReason.trim());
      setStatus(updated.status);
      setShowRejectReason(false);
      onUpdated(updated as AdminRiderRow);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de refuser ce dossier.");
    } finally {
      setSaving(false);
    }
  }

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
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {rider.profilePhotoUrl ? (
              <img
                src={rider.profilePhotoUrl}
                alt=""
                className="h-11 w-11 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gris-light text-sm font-bold text-nuit">
                {rider.user.firstName[0]}
                {rider.user.lastName[0]}
              </div>
            )}
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

        {rider.status === "PENDING" && (
          <div className="mb-5 rounded-sm bg-orange-50 p-4">
            {!showRejectReason ? (
              <div className="flex items-center gap-3">
                <p className="flex-1 text-sm text-nuit">
                  Ce livreur attend une validation KYC.
                  {missingProfilePhoto && (
                    <span className="mt-1 block text-xs font-semibold text-red-500">
                      ⚠️ Photo de profil manquante — validation impossible tant qu'elle n'est pas fournie.
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={handleValidate}
                  disabled={saving || missingProfilePhoto}
                  title={missingProfilePhoto ? "Photo de profil obligatoire manquante" : undefined}
                  className="flex items-center gap-1.5 rounded-sm bg-golfe-green px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  <CheckCircle2 size={14} /> Valider
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejectReason(true)}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-sm border border-red-200 px-3.5 py-2 text-xs font-semibold text-red-500 disabled:opacity-60"
                >
                  <XCircle size={14} /> Refuser
                </button>
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-nuit">
                  Motif du refus (envoyé par email au livreur)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ex: La photo de la pièce d'identité n'est pas lisible."
                  rows={3}
                  className="w-full rounded-sm border border-gris-light bg-white px-3 py-2 text-sm"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectReason(false)}
                    className="rounded-sm px-3 py-1.5 text-xs font-semibold text-gris"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={saving || !rejectReason.trim()}
                    className="rounded-sm bg-red-500 px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Envoyer le refus
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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

        {/* État civil / adresse */}
        <div className="mb-5 grid grid-cols-2 gap-4 rounded-sm bg-gris-light p-4">
          <DetailField label="Date de naissance" value={rider.birthDate ? new Date(rider.birthDate).toLocaleDateString("fr-FR") : null} />
          <DetailField label="Statut professionnel" value={rider.professionalStatus} />
          <DetailField
            label="Adresse"
            value={rider.street || rider.city ? `${rider.street ?? ""}, ${rider.zipCode ?? ""} ${rider.city ?? ""}`.trim() : null}
          />
          <DetailField label="SIRET (si indépendant)" value={rider.siret} />
          <DetailField label="Assurance" value={rider.insuranceProvider} />
          <DetailField label="N° police d'assurance" value={rider.insurancePolicyNumber} />
        </div>

        {/* CGU/CGV */}
        <div className="mb-5 rounded-sm bg-gris-light p-4">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gris">
            CGU / CGV{" "}
            <a href="https://www.doyougeckoo.fr/conditions-generales" target="_blank" rel="noreferrer" className="normal-case text-golfe-green underline">
              (voir le document)
            </a>
          </p>
          {rider.termsAcceptedAt ? (
            <p className="text-sm text-golfe-green">
              ✅ Acceptées le {new Date(rider.termsAcceptedAt).toLocaleDateString("fr-FR")}
              {rider.termsVersion && ` (version ${rider.termsVersion})`}
            </p>
          ) : (
            <p className="text-sm text-corail">❌ Pas encore acceptées</p>
          )}
        </div>

        {/* Documents KYC */}
        <div className="mb-6">
          <label className="mb-2 block text-xs font-semibold text-gris">📄 Documents KYC</label>
          <div className="grid grid-cols-3 gap-3">
            <DocThumb label="Photo de profil (visible client) *" url={rider.profilePhotoUrl} />
            <DocThumb label="Pièce d'identité — recto" url={rider.idCardFront} />
            <DocThumb label="Pièce d'identité — verso" url={rider.idCardBack} />
            <DocThumb label="Selfie de vérification" url={rider.verificationSelfieUrl} />
          </div>
        </div>

        {/* Avis clients — historique complet (visibles ET masqués par
            modération) puisque c'est une vue admin, contrairement aux
            écrans Pro/livreur qui ne montrent que les avis visibles. */}
        <div className="mb-6">
          <label className="mb-2 block text-xs font-semibold text-gris">💬 Avis clients</label>
          {reviewsStatus === "loading" ? (
            <p className="text-xs text-gris">Chargement des avis...</p>
          ) : reviewsStatus === "error" ? (
            <p className="text-xs text-red-500">Impossible de charger les avis.</p>
          ) : reviews.length === 0 ? (
            <p className="text-xs text-gris">Aucun avis pour le moment.</p>
          ) : (
            <div className="flex max-h-48 flex-col gap-2 overflow-y-auto rounded-sm bg-gris-light p-3">
              {reviews.map((review) => {
                const clientName = review.client?.user
                  ? `${review.client.user.firstName} ${review.client.user.lastName}`
                  : "Client";
                return (
                  <div key={review.id} className="rounded-sm bg-white p-2.5">
                    <div className="mb-0.5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-nuit">
                        {clientName}
                        {!review.isVisible && (
                          <span className="ml-1.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-500">
                            masqué
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-0.5 text-xs font-bold text-nuit">
                        <Star size={11} fill="#FF6B35" color="#FF6B35" /> {review.riderRating}
                      </span>
                    </div>
                    {review.riderComment && <p className="text-xs text-gris">{review.riderComment}</p>}
                  </div>
                );
              })}
            </div>
          )}
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

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gris">{label}</p>
      <p className="mt-0.5 text-sm text-nuit">{value || <span className="text-gris">— non renseigné —</span>}</p>
    </div>
  );
}

function DocThumb({ label, url }: { label: string; url?: string | null }) {
  if (!url) {
    return (
      <div className="flex h-24 flex-col items-center justify-center rounded-sm border border-dashed border-gris-light text-center">
        <span className="text-xs text-gris">Non fourni</span>
        <span className="mt-0.5 px-2 text-[10px] text-gris">{label}</span>
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      <div className="h-24 overflow-hidden rounded-sm border border-gris-light bg-gris-light">
        <img src={url} alt={label} className="h-full w-full object-cover" />
      </div>
      <p className="mt-1 text-center text-[10px] text-gris">{label}</p>
    </a>
  );
}
