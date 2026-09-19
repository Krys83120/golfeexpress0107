import React, { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { ParcelOrderStatus, PaymentStatus } from "@golfeexpress/types";
import { StatCard } from "@/components/StatCard";
import { ParcelOrderAdminModal } from "@/components/ParcelOrderAdminModal";
import { fetchAdminParcelOrders, deleteAdminParcelOrder, type AdminParcelOrderRow } from "@/services/parcelOrdersAdminApi";
import { PARCEL_ORDER_STATUS_LABELS, PARCEL_PAYMENT_BADGE_STYLES, getParcelPaymentBadgeTone, getParcelPaymentBadgeLabel } from "@/services/parcelOrderLabels";

/**
 * Page Admin Colis Express (19/09/2026) -- dernier volet du chantier demandé
 * par Krys : vue d'ensemble de toutes les demandes tous commerçants
 * confondus, réassigner/annuler une course, statistiques de revenus,
 * marquer payé manuellement (voir ParcelOrderAdminModal.tsx pour les 3
 * actions). Rendu en table plutôt qu'en Kanban (contrairement à
 * OrdersPage.tsx) -- volume attendu plus faible, et besoin de colonnes
 * financières + actions par ligne plutôt que d'un flux de préparation.
 */
const ALL = "all";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function AdminColisExpressPage() {
  const [parcelOrders, setParcelOrders] = useState<AdminParcelOrderRow[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>(ALL);
  const [selectedProId, setSelectedProId] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminParcelOrderRow | null>(null);

  // Suppression des demandes annulées (19/09/2026, retour de Krys : "cela
  // ne sert à rien de surcharger" -- pas de window.confirm() natif,
  // confirmation inline en 2 temps dans la ligne, même principe que
  // confirmingCancel dans ParcelOrderAdminModal.tsx.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function load() {
    setStatus("loading");
    fetchAdminParcelOrders()
      .then((rows) => {
        setParcelOrders(rows);
        setStatus("loaded");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Impossible de charger les demandes Colis Express.");
        setStatus("error");
      });
  }

  useEffect(() => {
    load();
    // Vue Admin temps réel comme OrdersPage.tsx -- les statuts changent en
    // continu côté Pro/Livreur.
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteAdminParcelOrder(id);
      setParcelOrders((rows) => rows.filter((r) => r.id !== id));
      setConfirmDeleteId(null);
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la suppression.");
    } finally {
      setDeletingId(null);
    }
  }

  const availablePros = useMemo(() => {
    const byId = new Map<string, string>();
    for (const p of parcelOrders) {
      if (p.pro?.id && p.pro.businessName) byId.set(p.pro.id, p.pro.businessName);
    }
    return Array.from(byId.entries()).sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }, [parcelOrders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return parcelOrders.filter((p) => {
      if (selectedStatus !== ALL && p.status !== selectedStatus) return false;
      if (selectedProId !== ALL && p.pro?.id !== selectedProId) return false;
      if (q) {
        const haystack = `${p.parcelNumber} ${p.recipientName} ${p.recipientPhone}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [parcelOrders, selectedStatus, selectedProId, search]);

  // Statistiques calculées à la volée à partir de la liste chargée (même
  // principe que le tableau "montants dus" de AdminFinancesPage.tsx) --
  // pas de route d'agrégation dédiée pour ce volume.
  const stats = useMemo(() => {
    const active = parcelOrders.filter((p) => p.status !== ParcelOrderStatus.CANCELLED);
    const paid = parcelOrders.filter((p) => p.paymentStatus === PaymentStatus.CAPTURED);
    const awaitingPayment = parcelOrders.filter(
      (p) =>
        p.status !== ParcelOrderStatus.CANCELLED &&
        (p.paymentStatus === PaymentStatus.PENDING || p.paymentStatus === PaymentStatus.AUTHORIZED)
    );
    return {
      total: parcelOrders.length,
      gmv: active.reduce((sum, p) => sum + p.total, 0),
      platformRevenue: paid.reduce((sum, p) => sum + p.platformEarnings, 0),
      riderPayouts: paid.reduce((sum, p) => sum + p.riderEarnings, 0),
      awaitingPaymentCount: awaitingPayment.length,
    };
  }, [parcelOrders]);

  const selectClass =
    "rounded-sm border border-gris-light bg-white px-3 py-2 text-sm text-nuit focus:border-golfe-green focus:outline-none";

  return (
    <div className="flex-1 p-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold text-nuit">Colis Express</h1>
        <p className="text-sm text-gris">
          Vue d'ensemble de toutes les demandes Colis Express, tous commerçants confondus
        </p>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        <StatCard icon="📦" label="Demandes (500 dernières)" value={String(stats.total)} />
        <StatCard icon="💰" label="Volume (hors annulées)" value={`${stats.gmv.toFixed(0)} €`} accentColor="#2196F3" />
        <StatCard
          icon="🏦"
          label="Revenus plateforme (payées)"
          value={`${stats.platformRevenue.toFixed(0)} €`}
          accentColor="#2ECC71"
        />
        <StatCard
          icon="🛵"
          label="Reversé aux livreurs (payées)"
          value={`${stats.riderPayouts.toFixed(0)} €`}
          accentColor="#9C27B0"
        />
      </div>

      {stats.awaitingPaymentCount > 0 && (
        <div className="mb-6 rounded-sm bg-orange-50 p-3 text-sm text-corail">
          {stats.awaitingPaymentCount} demande{stats.awaitingPaymentCount > 1 ? "s" : ""} en attente de paiement.
        </div>
      )}

      {/* FILTRES */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select className={selectClass} value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
          <option value={ALL}>Tous les statuts</option>
          {Object.values(ParcelOrderStatus).map((s) => (
            <option key={s} value={s}>
              {PARCEL_ORDER_STATUS_LABELS[s].label}
            </option>
          ))}
        </select>

        <select className={selectClass} value={selectedProId} onChange={(e) => setSelectedProId(e.target.value)}>
          <option value={ALL}>Tous les commerçants</option>
          {availablePros.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Rechercher (numéro, destinataire, téléphone)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-sm border border-gris-light bg-white px-3 py-2 text-sm text-nuit focus:border-golfe-green focus:outline-none"
        />

        {(selectedStatus !== ALL || selectedProId !== ALL || search) && (
          <button
            onClick={() => {
              setSelectedStatus(ALL);
              setSelectedProId(ALL);
              setSearch("");
            }}
            className="text-sm font-semibold text-golfe-green"
          >
            Réinitialiser les filtres
          </button>
        )}

        <span className="ml-auto text-xs text-gris">
          {filtered.length} demande{filtered.length > 1 ? "s" : ""} affichée{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      {status === "error" && (
        <div className="mb-6 rounded-sm bg-red-50 p-4 text-sm text-red-500">
          {error}{" "}
          <button onClick={load} className="font-semibold underline">
            Réessayer
          </button>
        </div>
      )}

      {status === "loading" && parcelOrders.length === 0 ? (
        <p className="py-12 text-center text-sm text-gris">Chargement des demandes...</p>
      ) : (
        <div className="overflow-x-auto rounded bg-white shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gris-light text-xs uppercase tracking-wide text-gris">
                <th className="px-4 py-3 font-medium">Numéro</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Paiement</th>
                <th className="px-4 py-3 font-medium">Commerçant</th>
                <th className="px-4 py-3 font-medium">Destinataire</th>
                <th className="px-4 py-3 font-medium">Livreur</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Placée le</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-sm text-gris">
                    Aucune demande Colis Express.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const statusMeta = PARCEL_ORDER_STATUS_LABELS[p.status];
                  const paymentTone = getParcelPaymentBadgeTone(p);
                  const paymentStyle = PARCEL_PAYMENT_BADGE_STYLES[paymentTone];
                  const isCancelled = p.status === ParcelOrderStatus.CANCELLED;
                  const isConfirmingDelete = confirmDeleteId === p.id;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelected(p)}
                      className="cursor-pointer border-b border-gris-light text-sm last:border-0 hover:bg-gris-light/40"
                    >
                      <td className="px-4 py-3 font-semibold text-nuit">{p.parcelNumber}</td>
                      <td className="px-4 py-3">
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{ backgroundColor: statusMeta.bg, color: statusMeta.text }}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{ backgroundColor: paymentStyle.bg, color: paymentStyle.text }}
                        >
                          {getParcelPaymentBadgeLabel(p)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-nuit">{p.pro?.businessName ?? "—"}</td>
                      <td className="px-4 py-3 text-nuit">{p.recipientName}</td>
                      <td className="px-4 py-3 text-gris">
                        {p.rider ? `${p.rider.user.firstName} ${p.rider.user.lastName}` : "—"}
                      </td>
                      <td className="px-4 py-3 font-bold text-nuit">{p.total.toFixed(2)} €</td>
                      <td className="px-4 py-3 text-xs text-gris">{formatDateTime(p.placedAt)}</td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {isCancelled &&
                          (isConfirmingDelete ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-[11px] text-gris">Supprimer ?</span>
                              <button
                                onClick={() => handleDelete(p.id)}
                                disabled={deletingId === p.id}
                                className="rounded-sm bg-red-500 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-40"
                              >
                                {deletingId === p.id ? "..." : "Oui"}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded-sm border border-gris-light px-2 py-1 text-[11px] font-semibold text-nuit"
                              >
                                Non
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(p.id)}
                              title="Supprimer cette demande annulée"
                              className="text-gris hover:text-red-500"
                            >
                              <Trash2 size={14} />
                            </button>
                          ))}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <ParcelOrderAdminModal
          parcelOrder={selected}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setParcelOrders((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
            setSelected(updated);
          }}
          onDeleted={(id) => {
            setParcelOrders((rows) => rows.filter((r) => r.id !== id));
          }}
        />
      )}
    </div>
  );
}
