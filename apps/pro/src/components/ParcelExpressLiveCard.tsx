import React, { useEffect, useState } from "react";
import { ParcelOrderStatus } from "@golfeexpress/types";
import type { ParcelOrder } from "@golfeexpress/types";
import { fetchMyParcelOrders } from "@/services/parcelOrdersApi";
import { MapView, type MapPin } from "@/components/MapView";

// Un livreur est en course sur la demande dans ces 3 statuts -- même
// ensemble que TRACKABLE_STATUSES dans ColisExpressPage.tsx (petite
// duplication volontaire, même principe que parcelOrderLabels.ts : fichier
// autonome, pas de dépendance croisée entre une page et un composant de
// dashboard).
const TRACKABLE_STATUSES = new Set<string>([
  ParcelOrderStatus.RIDER_ASSIGNED,
  ParcelOrderStatus.PICKED_UP,
  ParcelOrderStatus.IN_DELIVERY,
]);

const STATUS_LABELS: Record<string, string> = {
  [ParcelOrderStatus.RIDER_ASSIGNED]: "Livreur en route",
  [ParcelOrderStatus.PICKED_UP]: "Colis récupéré",
  [ParcelOrderStatus.IN_DELIVERY]: "En livraison",
};

function riderName(p: ParcelOrder): string {
  const rider = p.rider as unknown as { user?: { firstName?: string; lastName?: string } } | null | undefined;
  const first = rider?.user?.firstName ?? "";
  const last = rider?.user?.lastName ?? "";
  return `${first} ${last}`.trim() || "Livreur assigné";
}

function riderPosition(p: ParcelOrder): { lat: number; lng: number } | null {
  const rider = p.rider as unknown as { currentLat?: number | null; currentLng?: number | null } | null | undefined;
  if (rider?.currentLat == null || rider?.currentLng == null) return null;
  return { lat: rider.currentLat, lng: rider.currentLng };
}

function buildTrackingPins(p: ParcelOrder): MapPin[] {
  const pins: MapPin[] = [];
  if (p.fromAddress) {
    pins.push({
      id: `from-${p.id}`,
      lat: p.fromAddress.lat,
      lng: p.fromAddress.lng,
      color: "#2ECC71",
      label: "🏪",
      popupContent: "Retrait — votre boutique",
    });
  }
  if (p.toAddress) {
    pins.push({
      id: `to-${p.id}`,
      lat: p.toAddress.lat,
      lng: p.toAddress.lng,
      color: "#F97316",
      label: "🏁",
      popupContent: `Livraison — ${p.recipientName}`,
    });
  }
  const position = riderPosition(p);
  if (position) {
    pins.push({
      id: `rider-${p.id}`,
      lat: position.lat,
      lng: position.lng,
      color: "#2196F3",
      label: "🛵",
      popupContent: `${riderName(p)} — position en direct`,
    });
  }
  return pins;
}

/**
 * Carte "Colis Express en cours" sur le Dashboard Pro (23/09/2026, retour de
 * Krys : la visu en direct existait déjà sur l'onglet Colis Express, mais
 * fallait y aller puis déplier une demande pour la voir -- ici elle est
 * visible d'un coup d'œil dès l'accueil, sans naviguer).
 *
 * Interroge GET /api/parcel-orders (même route et même sérialisation que
 * ColisExpressPage.tsx -- rider.currentLat/currentLng déjà enrichis côté
 * serveur, voir ce fichier), filtre les demandes avec un livreur
 * effectivement en course (TRACKABLE_STATUSES), et se rafraîchit
 * automatiquement tant qu'il y en a au moins une -- même intervalle (15s)
 * que la carte de suivi de ColisExpressPage.tsx.
 *
 * Affiche toujours la carte, même sans demande en cours (message "Aucun
 * Colis Express en cours" plutôt que de disparaître) -- pour rester un
 * repère stable du dashboard, jamais un bloc qui apparaît/disparaît de
 * façon imprévisible.
 */
export function ParcelExpressLiveCard() {
  const [parcelOrders, setParcelOrders] = useState<ParcelOrder[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");

  function load() {
    // Pas de retour à "loading" après le premier chargement -- évite un
    // clignotement de la carte (et donc de Leaflet) toutes les 15s pendant
    // le polling silencieux ci-dessous.
    setStatus((s) => (s === "loaded" ? s : "loading"));
    fetchMyParcelOrders()
      .then((orders) => {
        setParcelOrders(orders);
        setStatus("loaded");
      })
      .catch(() => setStatus("error"));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeParcelOrders = parcelOrders.filter((p) => TRACKABLE_STATUSES.has(p.status));

  useEffect(() => {
    if (activeParcelOrders.length === 0) return;
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [activeParcelOrders.length]);

  return (
    <div className="rounded-sm border border-gris-light bg-white p-5">
      <h2 className="mb-4 font-heading text-base font-bold text-nuit">📦 Colis Express en cours</h2>

      {status === "loading" && parcelOrders.length === 0 && <p className="text-sm text-gris">Chargement...</p>}

      {status === "error" && (
        <div className="rounded-sm bg-red-50 p-3 text-sm text-red-500">
          Impossible de charger le suivi.{" "}
          <button onClick={load} className="font-semibold underline">
            Réessayer
          </button>
        </div>
      )}

      {status === "loaded" && activeParcelOrders.length === 0 && (
        <p className="text-sm text-gris">Aucun Colis Express en cours pour l'instant.</p>
      )}

      <div className="flex flex-col gap-4">
        {activeParcelOrders.map((p) => (
          <div key={p.id}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-nuit">{p.parcelNumber}</span>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-[#2196F3]">
                {STATUS_LABELS[p.status] ?? p.status}
              </span>
            </div>
            <p className="mb-2 text-xs text-gris">
              {riderName(p)} → {p.recipientName}
            </p>
            <MapView pins={buildTrackingPins(p)} height={180} emptyLabel="Position du livreur pas encore disponible" />
          </div>
        ))}
      </div>
    </div>
  );
}
