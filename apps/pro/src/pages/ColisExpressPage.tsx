import React, { useEffect, useState } from "react";
import { ParcelSize, PaymentStatus, ParcelOrderStatus } from "@golfeexpress/types";
import type { ParcelOrder } from "@golfeexpress/types";
import {
  createParcelOrder,
  createParcelOrderPaymentIntent,
  updateParcelOrder,
  cancelParcelOrder,
  deleteParcelOrder,
  fetchMyParcelOrders,
  geocodeAddress,
} from "@/services/parcelOrdersApi";
import { ApiRequestError } from "@/services/apiClient";
import { ColisExpressPayment } from "@/components/ColisExpressPayment";
import { ImageUploadField } from "@/components/ImageUploadField";
import { MapView, type MapPin } from "@/components/MapView";
import { uploadParcelOrderPhoto, withCacheBust } from "@/services/uploadsApi";
import { useAuthStore } from "@/store/useAuthStore";

const SIZE_LABELS: Record<ParcelSize, string> = {
  [ParcelSize.S]: "S — petit colis (enveloppe, boîte à chaussures)",
  [ParcelSize.M]: "M — colis moyen (carton standard, sac)",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  RIDER_ASSIGNED: "Livreur en route",
  PICKED_UP: "Colis récupéré",
  IN_DELIVERY: "En livraison",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#FF6B35",
  CONFIRMED: "#2196F3",
  RIDER_ASSIGNED: "#2196F3",
  PICKED_UP: "#2196F3",
  IN_DELIVERY: "#2196F3",
  DELIVERED: "#2ECC71",
  CANCELLED: "#9CA3AF",
};

// Modifiable uniquement avant qu'un livreur soit assigné -- au-delà, la
// course est déjà engagée (même règle que côté API, voir
// parcel-orders/update/route.ts).
const EDITABLE_STATUSES = new Set<string>([ParcelOrderStatus.PENDING, ParcelOrderStatus.CONFIRMED]);
// Annulable tant que le colis n'a pas encore été récupéré par le livreur
// (même règle que côté API, voir parcel-orders/cancel/route.ts).
const CANCELLABLE_STATUSES = new Set<string>([
  ParcelOrderStatus.PENDING,
  ParcelOrderStatus.CONFIRMED,
  ParcelOrderStatus.RIDER_ASSIGNED,
]);

// Un livreur est en course sur la demande dans ces 3 statuts -- c'est là que
// le suivi en direct (position GPS + statut) a un sens (23/09/2026, finition
// du workflow Livreur). Avant RIDER_ASSIGNED, il n'y a personne à suivre ;
// après DELIVERED/CANCELLED, la course est terminée.
const TRACKABLE_STATUSES = new Set<string>([
  ParcelOrderStatus.RIDER_ASSIGNED,
  ParcelOrderStatus.PICKED_UP,
  ParcelOrderStatus.IN_DELIVERY,
]);

const EMPTY_FORM = {
  recipientName: "",
  recipientPhone: "",
  deliveryStreet: "",
  deliveryComplement: "",
  deliveryZipCode: "",
  deliveryCity: "Sainte-Maxime",
  size: ParcelSize.S,
  instructions: "",
};

/** Une demande est payée dès que paymentStatus === CAPTURED (confirmé côté webhook Stripe). */
function isPaid(p: ParcelOrder): boolean {
  return p.paymentStatus === PaymentStatus.CAPTURED;
}

function canEdit(p: ParcelOrder): boolean {
  return EDITABLE_STATUSES.has(p.status);
}

function canCancel(p: ParcelOrder): boolean {
  return CANCELLABLE_STATUSES.has(p.status);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * GET /api/parcel-orders inclut le livreur sous la forme { id, user: {
 * firstName, lastName } } (voir la route) -- un sous-ensemble du modèle
 * Rider complet, pas strictement typé dans @golfeexpress/types. Même
 * correctif que les casts `as` déjà utilisés ailleurs sur ce genre d'écart
 * entre le type Prisma/API et le type partagé (voir ex. webhooks/stripe).
 */
function riderName(p: ParcelOrder): string {
  const rider = p.rider as unknown as { user?: { firstName?: string; lastName?: string } } | null | undefined;
  const first = rider?.user?.firstName ?? "";
  const last = rider?.user?.lastName ?? "";
  return `${first} ${last}`.trim() || "Livreur assigné";
}

/**
 * Position GPS courante du livreur assigné (23/09/2026, finition du
 * workflow Livreur) -- alimentée par PATCH /api/riders/me/location, même
 * champ exactement que le suivi des commandes classiques (voir
 * parcel-orders/route.ts, GET, qui enrichit déjà `rider` avec
 * currentLat/currentLng/vehicleType pour cette raison).
 */
function riderPosition(p: ParcelOrder): { lat: number; lng: number } | null {
  const rider = p.rider as unknown as { currentLat?: number | null; currentLng?: number | null } | null | undefined;
  if (rider?.currentLat == null || rider?.currentLng == null) return null;
  return { lat: rider.currentLat, lng: rider.currentLng };
}

/**
 * Construit les points de la carte de suivi d'une demande : boutique
 * (retrait), destinataire (livraison), et position du livreur si déjà
 * connue. Toujours les 2 premiers points même avant assignation d'un
 * livreur -- seul TRACKABLE_STATUSES décide si ce bloc s'affiche du tout
 * (voir plus bas).
 */
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
 * Espace Pro -- MVP Colis Express (19/09/2026), voir la proposition envoyée
 * à Krys. La demande est créée d'abord (statut "En attente", non payée),
 * puis le paiement carte est demandé immédiatement après (voir
 * ColisExpressPayment.tsx) -- carte ressaisie à chaque fois, pas de carte
 * enregistrée. Si le Pro annule ou ferme le paiement avant de le finaliser,
 * la demande reste visible dans "Demandes récentes" avec un bouton
 * "Payer" pour reprendre le paiement plus tard.
 *
 * Consultation/modification/annulation (ajout du 19/09/2026, suite au
 * retour de Krys) : chaque demande peut être dépliée pour voir le détail
 * complet (adresse, instructions, livreur assigné, carte utilisée...),
 * modifiée tant qu'aucun livreur n'est assigné, et annulée tant que le colis
 * n'a pas encore été récupéré -- voir canEdit/canCancel ci-dessus, mêmes
 * règles que côté API.
 *
 * Photo du colis (ajout du 19/09/2026, demande de Krys) : uploadée dans le
 * formulaire d'édition, tant que la demande reste PENDING/CONFIRMED (même
 * règle que canEdit ci-dessus). Stockée (ParcelOrder.photoUrl) et visible
 * ici côté Pro.
 *
 * Suivi en direct (23/09/2026, finition du workflow Livreur) : une fois un
 * livreur assigné (RIDER_ASSIGNED/PICKED_UP/IN_DELIVERY), le détail déplié
 * affiche une carte avec la boutique, le destinataire, et la position GPS du
 * livreur -- rafraîchie automatiquement tant qu'au moins une demande est en
 * cours de livraison (voir le useEffect de polling ci-dessous), sur le même
 * principe que le suivi des commandes classiques côté Pro.
 */
export function ColisExpressPage() {
  const proId = useAuthStore((s) => s.profile?.id);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<ParcelOrder | null>(null);

  const [parcelOrders, setParcelOrders] = useState<ParcelOrder[]>([]);
  const [listStatus, setListStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");

  // Demande en cours de paiement (juste créée, ou reprise depuis la liste
  // via "Payer") -- tant que ceci est défini, le formulaire/la liste
  // s'effacent au profit de l'écran de paiement Stripe.
  const [paymentTarget, setPaymentTarget] = useState<ParcelOrder | null>(null);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Détail déplié dans la liste (un seul à la fois).
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Édition en cours (un seul à la fois) -- éditée en place dans la carte
  // de la demande concernée, pas d'écran séparé.
  const [editTarget, setEditTarget] = useState<ParcelOrder | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Annulation : demande de confirmation avant d'envoyer la requête (pas de
  // window.confirm() natif, cohérent avec le reste de l'app).
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelSubmittingId, setCancelSubmittingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Suppression définitive d'une demande annulée (19/09/2026, retour de
  // Krys : "cela ne sert à rien de surcharger" -- même principe de
  // confirmation en 2 temps que l'annulation ci-dessus, pas de window.confirm().
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteSubmittingId, setDeleteSubmittingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function loadList() {
    setListStatus("loading");
    fetchMyParcelOrders()
      .then((orders) => {
        setParcelOrders(orders);
        setListStatus("loaded");
      })
      .catch(() => setListStatus("error"));
  }

  useEffect(() => {
    loadList();
  }, []);

  // Suivi en direct (23/09/2026) -- tant qu'au moins une demande a un
  // livreur en course, on rafraîchit la liste régulièrement pour que la
  // position (rider.currentLat/currentLng) et le statut avancent sous les
  // yeux du Pro sans qu'il ait à recharger la page. Pas de rafraîchissement
  // silencieux plus large (spinner "Chargement..." à chaque tick) : loadList
  // remet listStatus à "loading" à chaque appel, acceptable ici vu
  // l'intervalle large (15s) et le fait que la liste reste affichée pendant
  // le chargement.
  useEffect(() => {
    const hasTrackable = parcelOrders.some((p) => TRACKABLE_STATUSES.has(p.status));
    if (!hasTrackable) return;
    const interval = setInterval(loadList, 15000);
    return () => clearInterval(interval);
  }, [parcelOrders]);

  function updateField<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function startPayment(parcelOrder: ParcelOrder) {
    setPaymentTarget(parcelOrder);
    setPaymentClientSecret(null);
    setPaymentError(null);
    setPaymentLoading(true);
    try {
      const clientSecret = await createParcelOrderPaymentIntent(parcelOrder.id);
      setPaymentClientSecret(clientSecret);
    } catch (err) {
      setPaymentError(err instanceof ApiRequestError ? err.message : "Impossible de préparer le paiement.");
    } finally {
      setPaymentLoading(false);
    }
  }

  function cancelPayment() {
    setPaymentTarget(null);
    setPaymentClientSecret(null);
    setPaymentError(null);
  }

  function handlePaymentSuccess() {
    if (paymentTarget) {
      setLastCreated(paymentTarget);
    }
    setPaymentTarget(null);
    setPaymentClientSecret(null);
    // Le webhook Stripe met à jour le statut côté serveur quasi
    // instantanément mais de façon asynchrone -- un petit délai avant de
    // recharger la liste évite d'afficher encore "En attente / non payé"
    // pendant la fraction de seconde où le webhook n'a pas encore été reçu.
    setTimeout(loadList, 1200);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (
      !form.recipientName.trim() ||
      !form.recipientPhone.trim() ||
      !form.deliveryStreet.trim() ||
      !form.deliveryZipCode.trim() ||
      !form.deliveryCity.trim()
    ) {
      setError("Merci de compléter au moins le destinataire, son téléphone et l'adresse de livraison.");
      return;
    }

    setSubmitting(true);
    try {
      const coords = await geocodeAddress(
        form.deliveryStreet.trim(),
        form.deliveryZipCode.trim(),
        form.deliveryCity.trim()
      );
      if (!coords) {
        setError("Adresse de livraison introuvable — vérifiez l'orthographe de la rue et de la ville.");
        return;
      }

      const parcelOrder = await createParcelOrder({
        recipientName: form.recipientName.trim(),
        recipientPhone: form.recipientPhone.trim(),
        deliveryStreet: form.deliveryStreet.trim(),
        deliveryComplement: form.deliveryComplement.trim() || undefined,
        deliveryZipCode: form.deliveryZipCode.trim(),
        deliveryCity: form.deliveryCity.trim(),
        deliveryLat: coords.lat,
        deliveryLng: coords.lng,
        size: form.size,
        instructions: form.instructions.trim() || undefined,
      });

      setForm(EMPTY_FORM);
      loadList();
      // Enchaîne directement sur le paiement -- la demande existe déjà en
      // base (statut "En attente", non payée) même si le Pro annule le
      // paiement ensuite ; il pourra le reprendre depuis la liste.
      await startPayment(parcelOrder);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Impossible de créer la demande.");
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(p: ParcelOrder) {
    setExpandedId(null);
    setCancellingId(null);
    setEditError(null);
    setEditTarget(p);
    setEditForm({
      recipientName: p.recipientName,
      recipientPhone: p.recipientPhone,
      deliveryStreet: p.toAddress?.street ?? "",
      deliveryComplement: p.toAddress?.complement ?? "",
      deliveryZipCode: p.toAddress?.zipCode ?? "",
      deliveryCity: p.toAddress?.city ?? "",
      size: p.size,
      instructions: p.instructions ?? "",
    });
  }

  function closeEdit() {
    setEditTarget(null);
    setEditError(null);
  }

  function updateEditField<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setEditForm((f) => ({ ...f, [key]: value }));
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditError(null);

    if (!editForm.recipientName.trim() || !editForm.recipientPhone.trim()) {
      setEditError("Le nom et le téléphone du destinataire sont requis.");
      return;
    }

    const paid = isPaid(editTarget);

    setEditSubmitting(true);
    try {
      let addressPatch: Partial<{
        deliveryStreet: string;
        deliveryComplement: string | null;
        deliveryZipCode: string;
        deliveryCity: string;
        deliveryLat: number;
        deliveryLng: number;
        size: ParcelSize;
      }> = {};

      // Adresse/gabarit non modifiables une fois la demande payée -- voir
      // parcel-orders/update/route.ts. On n'envoie alors même pas ces
      // champs plutôt que de laisser la route les rejeter.
      if (!paid) {
        if (!editForm.deliveryStreet.trim() || !editForm.deliveryZipCode.trim() || !editForm.deliveryCity.trim()) {
          setEditError("L'adresse de livraison est requise.");
          setEditSubmitting(false);
          return;
        }
        const coords = await geocodeAddress(
          editForm.deliveryStreet.trim(),
          editForm.deliveryZipCode.trim(),
          editForm.deliveryCity.trim()
        );
        if (!coords) {
          setEditError("Adresse de livraison introuvable — vérifiez l'orthographe.");
          setEditSubmitting(false);
          return;
        }
        addressPatch = {
          deliveryStreet: editForm.deliveryStreet.trim(),
          deliveryComplement: editForm.deliveryComplement.trim() || null,
          deliveryZipCode: editForm.deliveryZipCode.trim(),
          deliveryCity: editForm.deliveryCity.trim(),
          deliveryLat: coords.lat,
          deliveryLng: coords.lng,
          size: editForm.size,
        };
      }

      const updated = await updateParcelOrder({
        parcelOrderId: editTarget.id,
        recipientName: editForm.recipientName.trim(),
        recipientPhone: editForm.recipientPhone.trim(),
        instructions: editForm.instructions.trim() || null,
        ...addressPatch,
      });

      setParcelOrders((list) => list.map((p) => (p.id === updated.id ? updated : p)));
      setEditTarget(null);
    } catch (err) {
      setEditError(err instanceof ApiRequestError ? err.message : "Impossible de modifier la demande.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function confirmCancel(id: string) {
    setCancelError(null);
    setCancelSubmittingId(id);
    try {
      const updated = await cancelParcelOrder(id);
      setParcelOrders((list) => list.map((p) => (p.id === updated.id ? updated : p)));
      setCancellingId(null);
    } catch (err) {
      setCancelError(err instanceof ApiRequestError ? err.message : "Impossible d'annuler la demande.");
    } finally {
      setCancelSubmittingId(null);
    }
  }

  /** Suppression définitive (19/09/2026) -- réservée aux demandes déjà annulées, voir parcel-orders/route.ts (DELETE). */
  async function confirmDelete(id: string) {
    setDeleteError(null);
    setDeleteSubmittingId(id);
    try {
      await deleteParcelOrder(id);
      setParcelOrders((list) => list.filter((p) => p.id !== id));
      setDeletingId(null);
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      setDeleteError(err instanceof ApiRequestError ? err.message : "Impossible de supprimer la demande.");
    } finally {
      setDeleteSubmittingId(null);
    }
  }

  /**
   * Upload de la photo du colis (19/09/2026) -- uploade d'abord vers
   * Supabase Storage (bucket "parcel-photos"), puis enregistre l'URL sur la
   * demande via l'endpoint d'édition existant (même règles PENDING/CONFIRMED
   * que le reste de l'édition, voir canEdit). Les erreurs remontent telles
   * quelles : ImageUploadField les affiche déjà lui-même.
   */
  async function handlePhotoUpload(parcelOrderId: string, file: File) {
    if (!proId) throw new Error("Profil commerçant introuvable.");
    const url = await uploadParcelOrderPhoto(proId, parcelOrderId, file);
    const updated = await updateParcelOrder({ parcelOrderId, photoUrl: url });
    setParcelOrders((list) => list.map((p) => (p.id === updated.id ? updated : p)));
    if (editTarget?.id === updated.id) setEditTarget(updated);
    if (lastCreated?.id === updated.id) setLastCreated(updated);
  }

  // ÉCRAN DE PAIEMENT -- remplace tout le reste tant qu'un paiement est en cours.
  if (paymentTarget) {
    return (
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-md rounded-sm border border-gris-light bg-white p-5">
          <h2 className="mb-1 font-heading text-base font-bold text-nuit">
            Paiement -- {paymentTarget.parcelNumber}
          </h2>
          <p className="mb-4 text-sm text-gris">
            {paymentTarget.recipientName} — {paymentTarget.toAddress?.city ?? ""}
          </p>

          {paymentLoading && <p className="text-sm text-gris">Préparation du paiement...</p>}

          {paymentError && (
            <div className="mb-4 rounded-sm bg-red-50 p-3 text-sm text-red-500">
              {paymentError}
              <button onClick={() => startPayment(paymentTarget)} className="ml-2 font-semibold underline">
                Réessayer
              </button>
            </div>
          )}

          {paymentClientSecret && (
            <ColisExpressPayment
              clientSecret={paymentClientSecret}
              amount={paymentTarget.total}
              onSuccess={handlePaymentSuccess}
              onCancel={cancelPayment}
            />
          )}

          {!paymentLoading && !paymentClientSecret && !paymentError && (
            <button onClick={cancelPayment} className="mt-2 w-full text-sm font-medium text-gris underline">
              Annuler
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold text-nuit">📦 Colis Express</h1>
        <p className="text-sm text-gris">
          Faites livrer un petit colis rapidement, avec les mêmes livreurs que vos commandes.
        </p>
      </div>

      {lastCreated && (
        <div className="mb-6 rounded-sm border-2 border-golfe-green/20 bg-golfe-green/5 p-4">
          <p className="text-sm font-semibold text-nuit">✅ Demande {lastCreated.parcelNumber} payée</p>
          <p className="mt-1 text-sm text-gris">Tarif : {lastCreated.total.toFixed(2)} € — un livreur va être assigné.</p>
          <div className="mt-3 max-w-[120px]">
            <label className="mb-1 block text-xs font-semibold text-gris">Photo du colis (optionnel)</label>
            <ImageUploadField
              currentImageUrl={lastCreated.photoUrl ? withCacheBust(lastCreated.photoUrl) : null}
              placeholder="📦"
              shape="square"
              onUpload={(file) => handlePhotoUpload(lastCreated.id, file)}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* FORMULAIRE */}
        <form onSubmit={handleSubmit} className="rounded-sm border border-gris-light bg-white p-5">
          <h2 className="mb-4 font-heading text-base font-bold text-nuit">Nouvelle demande</h2>

          {error && <div className="mb-4 rounded-sm bg-red-50 p-3 text-sm text-red-500">{error}</div>}

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gris">Destinataire</label>
              <input
                value={form.recipientName}
                onChange={(e) => updateField("recipientName", e.target.value)}
                placeholder="Nom du destinataire"
                className="w-full rounded-sm bg-gris-light px-3 py-2.5 text-sm text-nuit outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gris">Téléphone</label>
              <input
                value={form.recipientPhone}
                onChange={(e) => updateField("recipientPhone", e.target.value)}
                placeholder="06 12 34 56 78"
                className="w-full rounded-sm bg-gris-light px-3 py-2.5 text-sm text-nuit outline-none"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-xs font-semibold text-gris">Adresse de livraison</label>
            <input
              value={form.deliveryStreet}
              onChange={(e) => updateField("deliveryStreet", e.target.value)}
              placeholder="Rue"
              className="mb-2 w-full rounded-sm bg-gris-light px-3 py-2.5 text-sm text-nuit outline-none"
            />
            <input
              value={form.deliveryComplement}
              onChange={(e) => updateField("deliveryComplement", e.target.value)}
              placeholder="Complément (étage, bâtiment...) — optionnel"
              className="mb-2 w-full rounded-sm bg-gris-light px-3 py-2.5 text-sm text-nuit outline-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={form.deliveryZipCode}
                onChange={(e) => updateField("deliveryZipCode", e.target.value)}
                placeholder="Code postal"
                className="w-full rounded-sm bg-gris-light px-3 py-2.5 text-sm text-nuit outline-none"
              />
              <input
                value={form.deliveryCity}
                onChange={(e) => updateField("deliveryCity", e.target.value)}
                placeholder="Ville"
                className="w-full rounded-sm bg-gris-light px-3 py-2.5 text-sm text-nuit outline-none"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-xs font-semibold text-gris">Gabarit</label>
            <div className="flex gap-2">
              {(Object.values(ParcelSize) as ParcelSize[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => updateField("size", size)}
                  className="flex-1 rounded-sm border-2 px-3 py-2.5 text-left text-xs font-medium"
                  style={{
                    borderColor: form.size === size ? "#2ECC71" : "#F3F4F6",
                    backgroundColor: form.size === size ? "rgba(46,204,113,0.05)" : "white",
                    color: "#1A1A2E",
                  }}
                >
                  {SIZE_LABELS[size]}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="mb-1 block text-xs font-semibold text-gris">
              Instructions pour le livreur (optionnel)
            </label>
            <textarea
              value={form.instructions}
              onChange={(e) => updateField("instructions", e.target.value)}
              placeholder="Ex: sonner à l'interphone 3B, colis fragile..."
              rows={2}
              className="w-full rounded-sm bg-gris-light px-3 py-2.5 text-sm text-nuit outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-sm bg-golfe-green py-3 text-sm font-bold text-white"
            style={{ opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? "Envoi..." : "Demander l'enlèvement"}
          </button>
          <p className="mt-2 text-center text-[11px] text-gris">
            Le tarif inclut un forfait de service express (légèrement majoré au-delà de quelques kilomètres), en
            plus du tarif de livraison selon la distance. Vous pourrez ajouter une photo du colis juste après cette
            étape.
          </p>
        </form>

        {/* HISTORIQUE */}
        <div className="rounded-sm border border-gris-light bg-white p-5">
          <h2 className="mb-4 font-heading text-base font-bold text-nuit">Demandes récentes</h2>

          {listStatus === "loading" && <p className="text-sm text-gris">Chargement...</p>}
          {listStatus === "error" && (
            <div className="rounded-sm bg-red-50 p-3 text-sm text-red-500">
              Impossible de charger l'historique.{" "}
              <button onClick={loadList} className="font-semibold underline">
                Réessayer
              </button>
            </div>
          )}
          {listStatus === "loaded" && parcelOrders.length === 0 && (
            <p className="text-sm text-gris">Aucune demande de Colis Express pour l'instant.</p>
          )}

          <div className="flex flex-col gap-3">
            {parcelOrders.map((p) => {
              const isExpanded = expandedId === p.id;
              const isEditing = editTarget?.id === p.id;
              const isCancelling = cancellingId === p.id;
              const isDeleting = deletingId === p.id;

              return (
                <div key={p.id} className="rounded-sm border border-gris-light p-3.5">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      className="flex items-center gap-1.5 text-sm font-semibold text-nuit"
                    >
                      {p.parcelNumber}
                      <span className="text-[10px] text-gris">{isExpanded ? "▲" : "▼"}</span>
                    </button>
                    <div className="flex items-center gap-1.5">
                      {!isPaid(p) && p.status !== ParcelOrderStatus.CANCELLED && (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-500">
                          Non payé
                        </span>
                      )}
                      <span
                        className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                        style={{ backgroundColor: STATUS_COLORS[p.status] ?? "#9CA3AF" }}
                      >
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gris">
                    {p.recipientName} — {p.toAddress?.city ?? ""}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-1.5">
                    <p className="text-xs font-semibold text-golfe-green">{p.total.toFixed(2)} €</p>
                    <div className="flex items-center gap-1.5">
                      {!isPaid(p) && p.status !== ParcelOrderStatus.CANCELLED && (
                        <button
                          onClick={() => startPayment(p)}
                          className="rounded-full bg-golfe-green px-3 py-1 text-[11px] font-bold text-white"
                        >
                          Payer
                        </button>
                      )}
                      {canEdit(p) && (
                        <button
                          onClick={() => (isEditing ? closeEdit() : openEdit(p))}
                          className="rounded-full border border-gris-light px-3 py-1 text-[11px] font-semibold text-nuit"
                        >
                          {isEditing ? "Fermer" : "Modifier"}
                        </button>
                      )}
                      {canCancel(p) && (
                        <button
                          onClick={() => {
                            setCancelError(null);
                            setCancellingId(isCancelling ? null : p.id);
                          }}
                          className="rounded-full border border-red-200 px-3 py-1 text-[11px] font-semibold text-red-500"
                        >
                          Annuler
                        </button>
                      )}
                      {p.status === ParcelOrderStatus.CANCELLED && (
                        <button
                          onClick={() => {
                            setDeleteError(null);
                            setDeletingId(isDeleting ? null : p.id);
                          }}
                          className="rounded-full border border-red-200 px-3 py-1 text-[11px] font-semibold text-red-500"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>

                  {/* DÉTAIL */}
                  {isExpanded && !isEditing && (
                    <div className="mt-3 rounded-sm bg-gris-light/50 p-3 text-xs leading-relaxed text-gris">
                      <p>
                        <span className="font-semibold text-nuit">Destinataire :</span> {p.recipientName} —{" "}
                        {p.recipientPhone}
                      </p>
                      <p className="mt-1">
                        <span className="font-semibold text-nuit">Adresse :</span> {p.toAddress?.street}
                        {p.toAddress?.complement ? `, ${p.toAddress.complement}` : ""}, {p.toAddress?.zipCode}{" "}
                        {p.toAddress?.city}
                      </p>
                      <p className="mt-1">
                        <span className="font-semibold text-nuit">Gabarit :</span> {SIZE_LABELS[p.size]}
                      </p>
                      {p.instructions && (
                        <p className="mt-1">
                          <span className="font-semibold text-nuit">Instructions :</span> {p.instructions}
                        </p>
                      )}
                      {canEdit(p) ? (
                        <div className="mt-2 max-w-[112px]">
                          <span className="font-semibold text-nuit">Photo (optionnel) :</span>
                          <div className="mt-1">
                            <ImageUploadField
                              currentImageUrl={p.photoUrl ? withCacheBust(p.photoUrl) : null}
                              placeholder="📦"
                              shape="square"
                              onUpload={(file) => handlePhotoUpload(p.id, file)}
                            />
                          </div>
                        </div>
                      ) : (
                        p.photoUrl && (
                          <div className="mt-2">
                            <span className="font-semibold text-nuit">Photo :</span>
                            <img
                              src={withCacheBust(p.photoUrl)}
                              alt="Photo du colis"
                              className="mt-1 h-20 w-20 rounded-sm object-cover"
                            />
                          </div>
                        )
                      )}
                      {p.status !== ParcelOrderStatus.PENDING && p.rider && (
                        <p className="mt-1">
                          <span className="font-semibold text-nuit">Livreur :</span> {riderName(p)}
                        </p>
                      )}
                      {TRACKABLE_STATUSES.has(p.status) && (
                        <div className="mt-3">
                          <span className="mb-1 block font-semibold text-nuit">Suivi en direct :</span>
                          <MapView
                            pins={buildTrackingPins(p)}
                            height={200}
                            emptyLabel="Position du livreur pas encore disponible"
                          />
                          {!riderPosition(p) && (
                            <p className="mt-1 text-[11px] text-gris">
                              Le livreur n'a pas encore partagé sa position -- elle apparaîtra dès qu'il sera en
                              route.
                            </p>
                          )}
                        </div>
                      )}
                      {p.cardBrand && p.cardLast4 && (
                        <p className="mt-1">
                          <span className="font-semibold text-nuit">Carte utilisée :</span> {p.cardBrand.toUpperCase()}{" "}
                          •••• {p.cardLast4}
                        </p>
                      )}
                      <p className="mt-1">
                        <span className="font-semibold text-nuit">Créée le :</span> {formatDateTime(p.placedAt)}
                      </p>
                      {p.deliveredAt && (
                        <p className="mt-1">
                          <span className="font-semibold text-nuit">Livrée le :</span> {formatDateTime(p.deliveredAt)}
                        </p>
                      )}
                      {p.cancelledAt && (
                        <p className="mt-1">
                          <span className="font-semibold text-nuit">Annulée le :</span> {formatDateTime(p.cancelledAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* CONFIRMATION D'ANNULATION */}
                  {isCancelling && (
                    <div className="mt-3 rounded-sm border border-red-200 bg-red-50 p-3">
                      <p className="text-xs font-medium text-red-600">
                        Confirmer l'annulation de cette demande
                        {isPaid(p) ? " ? Le paiement sera intégralement remboursé." : " ?"}
                      </p>
                      {cancelError && <p className="mt-1 text-xs text-red-500">{cancelError}</p>}
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => confirmCancel(p.id)}
                          disabled={cancelSubmittingId === p.id}
                          className="rounded-sm bg-red-500 px-3 py-1.5 text-[11px] font-bold text-white"
                          style={{ opacity: cancelSubmittingId === p.id ? 0.7 : 1 }}
                        >
                          {cancelSubmittingId === p.id ? "Annulation..." : "Oui, annuler"}
                        </button>
                        <button
                          onClick={() => setCancellingId(null)}
                          className="rounded-sm border border-gris-light px-3 py-1.5 text-[11px] font-semibold text-gris"
                        >
                          Non
                        </button>
                      </div>
                    </div>
                  )}

                  {/* CONFIRMATION DE SUPPRESSION */}
                  {isDeleting && (
                    <div className="mt-3 rounded-sm border border-red-200 bg-red-50 p-3">
                      <p className="text-xs font-medium text-red-600">
                        Supprimer définitivement cette demande annulée ? Action irréversible.
                      </p>
                      {deleteError && <p className="mt-1 text-xs text-red-500">{deleteError}</p>}
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => confirmDelete(p.id)}
                          disabled={deleteSubmittingId === p.id}
                          className="rounded-sm bg-red-500 px-3 py-1.5 text-[11px] font-bold text-white"
                          style={{ opacity: deleteSubmittingId === p.id ? 0.7 : 1 }}
                        >
                          {deleteSubmittingId === p.id ? "Suppression..." : "Oui, supprimer"}
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="rounded-sm border border-gris-light px-3 py-1.5 text-[11px] font-semibold text-gris"
                        >
                          Non
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ÉDITION */}
                  {isEditing && (
                    <form onSubmit={handleEditSubmit} className="mt-3 rounded-sm border border-gris-light bg-white p-3">
                      {editError && (
                        <div className="mb-3 rounded-sm bg-red-50 p-2.5 text-xs text-red-500">{editError}</div>
                      )}

                      <div className="mb-3 grid grid-cols-2 gap-2">
                        <input
                          value={editForm.recipientName}
                          onChange={(e) => updateEditField("recipientName", e.target.value)}
                          placeholder="Nom du destinataire"
                          className="w-full rounded-sm bg-gris-light px-2.5 py-2 text-xs text-nuit outline-none"
                        />
                        <input
                          value={editForm.recipientPhone}
                          onChange={(e) => updateEditField("recipientPhone", e.target.value)}
                          placeholder="Téléphone"
                          className="w-full rounded-sm bg-gris-light px-2.5 py-2 text-xs text-nuit outline-none"
                        />
                      </div>

                      {isPaid(p) ? (
                        <p className="mb-3 rounded-sm bg-gris-light/60 p-2.5 text-[11px] text-gris">
                          Demande déjà payée : l'adresse et le gabarit ne sont plus modifiables. Annulez puis recréez
                          une demande si besoin.
                        </p>
                      ) : (
                        <>
                          <div className="mb-2">
                            <input
                              value={editForm.deliveryStreet}
                              onChange={(e) => updateEditField("deliveryStreet", e.target.value)}
                              placeholder="Rue"
                              className="mb-2 w-full rounded-sm bg-gris-light px-2.5 py-2 text-xs text-nuit outline-none"
                            />
                            <input
                              value={editForm.deliveryComplement}
                              onChange={(e) => updateEditField("deliveryComplement", e.target.value)}
                              placeholder="Complément — optionnel"
                              className="mb-2 w-full rounded-sm bg-gris-light px-2.5 py-2 text-xs text-nuit outline-none"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                value={editForm.deliveryZipCode}
                                onChange={(e) => updateEditField("deliveryZipCode", e.target.value)}
                                placeholder="Code postal"
                                className="w-full rounded-sm bg-gris-light px-2.5 py-2 text-xs text-nuit outline-none"
                              />
                              <input
                                value={editForm.deliveryCity}
                                onChange={(e) => updateEditField("deliveryCity", e.target.value)}
                                placeholder="Ville"
                                className="w-full rounded-sm bg-gris-light px-2.5 py-2 text-xs text-nuit outline-none"
                              />
                            </div>
                          </div>

                          <div className="mb-3 flex gap-2">
                            {(Object.values(ParcelSize) as ParcelSize[]).map((size) => (
                              <button
                                key={size}
                                type="button"
                                onClick={() => updateEditField("size", size)}
                                className="flex-1 rounded-sm border-2 px-2.5 py-2 text-left text-[11px] font-medium"
                                style={{
                                  borderColor: editForm.size === size ? "#2ECC71" : "#F3F4F6",
                                  backgroundColor: editForm.size === size ? "rgba(46,204,113,0.05)" : "white",
                                  color: "#1A1A2E",
                                }}
                              >
                                {SIZE_LABELS[size]}
                              </button>
                            ))}
                          </div>
                        </>
                      )}

                      <textarea
                        value={editForm.instructions}
                        onChange={(e) => updateEditField("instructions", e.target.value)}
                        placeholder="Instructions pour le livreur (optionnel)"
                        rows={2}
                        className="mb-3 w-full rounded-sm bg-gris-light px-2.5 py-2 text-xs text-nuit outline-none"
                      />

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={editSubmitting}
                          className="rounded-sm bg-golfe-green px-3 py-1.5 text-[11px] font-bold text-white"
                          style={{ opacity: editSubmitting ? 0.7 : 1 }}
                        >
                          {editSubmitting ? "Enregistrement..." : "Enregistrer"}
                        </button>
                        <button
                          type="button"
                          onClick={closeEdit}
                          className="rounded-sm border border-gris-light px-3 py-1.5 text-[11px] font-semibold text-gris"
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
