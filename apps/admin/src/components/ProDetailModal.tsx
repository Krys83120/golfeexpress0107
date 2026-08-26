import React, { useEffect, useState } from "react";
import { X, Star, CheckCircle2, XCircle, Package, FolderCog } from "lucide-react";
import type { ProStatus, Product, Review } from "@golfeexpress/types";
import { PRO_STATUS_LABELS, PRO_CATEGORY_EMOJIS } from "@/services/proLabels";
import {
  updateAdminPro,
  fetchAdminProProducts,
  toggleAdminProduct,
  fetchAdminProReviews,
  type AdminProRow,
} from "@/services/adminEntitiesApi";
import { validatePro } from "@/services/validationsApi";
import { AdminCategoryManagerModal } from "@/components/AdminCategoryManagerModal";
import { AdminProductDetailModal } from "@/components/AdminProductDetailModal";

interface ProDetailModalProps {
  pro: AdminProRow;
  onClose: () => void;
  onUpdated: (updated: AdminProRow) => void;
}

const DAY_LABELS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

/**
 * Un jour peut avoir plusieurs créneaux (Pro en coupure, ex: 10h-14h puis
 * 18h-23h — voir apps/pro/src/pages/SettingsPage.tsx) : on regroupe donc
 * par jour pour l'affichage plutôt qu'une ligne brute par créneau.
 */
function groupHoursByDay(hours: { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }[]) {
  const byDay = new Map<number, typeof hours>();
  for (const h of hours) byDay.set(h.dayOfWeek, [...(byDay.get(h.dayOfWeek) ?? []), h]);
  return [...byDay.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([dayOfWeek, rows]) => ({
      dayOfWeek,
      isClosed: rows.every((r) => r.isClosed),
      ranges: rows.filter((r) => !r.isClosed).sort((a, b) => a.openTime.localeCompare(b.openTime)),
    }));
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gris">{label}</p>
      <p className="mt-0.5 text-sm text-nuit">{value || <span className="text-gris">— non renseigné —</span>}</p>
    </div>
  );
}

export function ProDetailModal({ pro, onClose, onUpdated }: ProDetailModalProps) {
  const [status, setStatus] = useState<ProStatus>(pro.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsStatus, setProductsStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsStatus, setReviewsStatus] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setReviewsStatus("loading");
    fetchAdminProReviews(pro.id)
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
  }, [pro.id]);

  function reloadProducts() {
    fetchAdminProProducts(pro.id)
      .then((data) => setProducts(data))
      .catch(() => {});
  }

  useEffect(() => {
    fetchAdminProProducts(pro.id)
      .then((data) => {
        setProducts(data);
        setProductsStatus("loaded");
      })
      .catch(() => setProductsStatus("error"));
  }, [pro.id]);

  async function handleToggleProduct(productId: string, isAvailable: boolean) {
    try {
      const updated = await toggleAdminProduct(pro.id, productId, isAvailable);
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, isAvailable: updated.isAvailable } : p)));
      setSelectedProduct((prev) => (prev && prev.id === productId ? { ...prev, isAvailable: updated.isAvailable } : prev));
    } catch {
      // Échec silencieux acceptable ici — le toggle reste inchangé visuellement, l'admin peut réessayer.
    }
  }

  const categoriesWithCounts = Array.from(new Set(products.map((p) => p.category)))
    .sort()
    .map((name) => ({ name, count: products.filter((p) => p.category === name).length }));

  const rating = pro.rating ? Number(pro.rating) : null;
  const statusMeta = PRO_STATUS_LABELS[pro.status];

  async function handleValidate() {
    setSaving(true);
    setError(null);
    try {
      const updated = await validatePro(pro.id, true);
      setStatus(updated.status);
      onUpdated(updated as AdminProRow);
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
      const updated = await validatePro(pro.id, false, rejectReason.trim());
      setStatus(updated.status);
      setShowRejectReason(false);
      onUpdated(updated as AdminProRow);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de refuser ce dossier.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus: ProStatus) {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateAdminPro(pro.id, { status: newStatus });
      setStatus(updated.status);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de mettre à jour le statut.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gris-light text-xl">
              {PRO_CATEGORY_EMOJIS[pro.category]}
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-nuit">{pro.businessName}</h2>
              <p className="text-xs text-gris">{pro.user.email}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-gris-light">
            <X size={18} />
          </button>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-3 text-sm">
          <span
            className="rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ backgroundColor: statusMeta.bg, color: statusMeta.text }}
          >
            {statusMeta.label}
          </span>
          {rating && pro.ratingCount > 0 && (
            <span className="flex items-center gap-1 text-nuit">
              <Star size={13} fill="#FF6B35" color="#FF6B35" />
              {rating.toFixed(1)} <span className="text-xs text-gris">({pro.ratingCount})</span>
            </span>
          )}
          <span className="text-gris">{pro._count?.orders ?? 0} commandes</span>
        </div>

        {/* Actions de validation rapide — mises en avant pour un dossier en attente */}
        {pro.status === "PENDING" && (
          <div className="mb-6 rounded-sm bg-orange-50 p-4">
            {!showRejectReason ? (
              <div className="flex items-center gap-3">
                <p className="flex-1 text-sm text-nuit">Ce commerçant attend une validation KYC.</p>
                <button
                  type="button"
                  onClick={handleValidate}
                  disabled={saving}
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
                  Motif du refus (envoyé par email au commerçant)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ex: Le SIRET renseigné ne correspond pas au nom commercial déclaré."
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

        <div className="mb-6">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gris">🏪 Établissement</h3>
          <div className="grid grid-cols-2 gap-4 rounded-sm bg-gris-light p-4">
            <Field label="Nom commercial / enseigne" value={pro.businessName} />
            <Field label="Catégorie d'activité" value={`${PRO_CATEGORY_EMOJIS[pro.category]} ${pro.category}`} />
            <Field label="Email de contact" value={pro.emailContact} />
            <Field label="Téléphone professionnel" value={pro.phone} />
            <div className="col-span-2">
              <Field
                label="Adresse de retrait des commandes"
                value={
                  pro.addresses?.[0]
                    ? `${pro.addresses[0].street}${pro.addresses[0].complement ? ", " + pro.addresses[0].complement : ""}, ${pro.addresses[0].zipCode} ${pro.addresses[0].city}`
                    : null
                }
              />
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gris">🕐 Horaires d'ouverture</h3>
          {pro.openingHours && pro.openingHours.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-sm bg-gris-light p-4 text-sm">
              {groupHoursByDay(pro.openingHours).map((day) => (
                <div key={day.dayOfWeek} className="flex justify-between">
                  <span className="text-gris">{DAY_LABELS[day.dayOfWeek]}</span>
                  <span className="text-nuit">
                    {day.isClosed ? "Fermé" : day.ranges.map((r) => `${r.openTime} – ${r.closeTime}`).join(", ")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-sm bg-gris-light p-4 text-sm text-gris">— non renseignées —</p>
          )}
        </div>

        <div className="mb-6">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gris">📋 Identité légale</h3>
          <div className="grid grid-cols-2 gap-4 rounded-sm bg-gris-light p-4">
            <div className="col-span-2 flex items-center justify-between">
              <Field label="SIRET" value={pro.siret} />
              {pro.siretVerified ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-golfe-green">
                  <CheckCircle2 size={13} /> Vérifié
                  {pro.siretVerifiedAt && ` le ${new Date(pro.siretVerifiedAt).toLocaleDateString("fr-FR")}`}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold text-corail">
                  <XCircle size={13} /> Non vérifié
                </span>
              )}
            </div>
            <Field label="Raison sociale" value={pro.legalName} />
            <Field label="Forme juridique" value={pro.legalForm} />
            <Field label="N° TVA" value={pro.vatNumber} />
            <Field label="SIRET vérifié le" value={pro.siretVerifiedAt ? new Date(pro.siretVerifiedAt).toLocaleDateString("fr-FR") : null} />
            <Field
              label="Gérant"
              value={pro.managerFirstName || pro.managerLastName ? `${pro.managerFirstName ?? ""} ${pro.managerLastName ?? ""}`.trim() : null}
            />
            <Field label="Téléphone" value={pro.user.phone ?? pro.phone} />
          </div>
        </div>

        <div className="mb-6">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gris">
            📄 CGU / CGV{" "}
            <a href="https://www.doyougeckoo.fr/conditions-generales" target="_blank" rel="noreferrer" className="normal-case text-golfe-green underline">
              (voir le document)
            </a>
          </h3>
          <div className="rounded-sm bg-gris-light p-4">
            {pro.termsAcceptedAt ? (
              <p className="flex items-center gap-1.5 text-sm text-golfe-green">
                <CheckCircle2 size={15} /> Acceptées le {new Date(pro.termsAcceptedAt).toLocaleDateString("fr-FR")}
                {pro.termsVersion && ` (version ${pro.termsVersion})`}
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-sm text-corail">
                <XCircle size={15} /> Pas encore acceptées
              </p>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gris">📄 Extrait Kbis</h3>
          <div className="rounded-sm bg-gris-light p-4">
            {pro.kbisUrl ? (
              (() => {
                const uploadedAt = pro.kbisUploadedAt ? new Date(pro.kbisUploadedAt) : null;
                const ageMs = uploadedAt ? Date.now() - uploadedAt.getTime() : Infinity;
                const isFresh = ageMs < 90 * 24 * 60 * 60 * 1000;
                return (
                  <div className="flex items-center gap-3">
                    <a href={pro.kbisUrl} target="_blank" rel="noreferrer" className="flex-1 text-sm font-semibold text-golfe-green underline">
                      📄 Voir le document
                    </a>
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{ backgroundColor: isFresh ? "#E8F5E9" : "#FFEBEE", color: isFresh ? "#2ECC71" : "#F44336" }}
                    >
                      {isFresh
                        ? `À jour${uploadedAt ? " · " + uploadedAt.toLocaleDateString("fr-FR") : ""}`
                        : "⚠️ Plus de 3 mois — refuser et demander un renouvellement"}
                    </span>
                  </div>
                );
              })()
            ) : (
              <p className="text-sm text-corail">❌ Aucun Kbis fourni</p>
            )}
          </div>
        </div>

        {(pro.logo || pro.coverImage) && (
          <div className="mb-6 flex gap-4">
            {pro.logo && (
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gris">🖼️ Logo</h3>
                <a href={pro.logo} target="_blank" rel="noreferrer">
                  <img src={pro.logo} alt="Logo" className="h-20 w-20 rounded-sm object-cover" />
                </a>
              </div>
            )}
            {pro.coverImage && (
              <div className="flex-1">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gris">🖼️ Photo de couverture</h3>
                <a href={pro.coverImage} target="_blank" rel="noreferrer">
                  <img src={pro.coverImage} alt="Couverture" className="h-20 w-full rounded-sm object-cover" />
                </a>
              </div>
            )}
          </div>
        )}

        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gris">
              <Package size={13} /> Produits en ligne ({products.length})
            </h3>
            {categoriesWithCounts.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCategoryManager(true)}
                className="flex items-center gap-1 text-xs font-semibold text-golfe-green"
              >
                <FolderCog size={13} /> Modérer les catégories
              </button>
            )}
          </div>
          {productsStatus === "loading" ? (
            <p className="rounded-sm bg-gris-light p-4 text-sm text-gris">Chargement...</p>
          ) : products.length === 0 ? (
            <p className="rounded-sm bg-gris-light p-4 text-sm text-gris">Aucun produit ajouté pour l'instant.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-sm bg-gris-light">
              {products.map((product) => (
                <button
                  type="button"
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="flex w-full items-center gap-3 border-b border-white px-3 py-2 text-left last:border-0 hover:bg-white"
                >
                  <span className="flex-1 truncate text-sm text-nuit">{product.name}</span>
                  <span className="text-xs text-gris">{product.category}</span>
                  <span className="w-16 text-right text-xs font-semibold text-nuit">
                    {Number(product.price).toFixed(2)} €
                  </span>
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{
                      backgroundColor: product.isAvailable ? "#E8F5E9" : "#FFEBEE",
                      color: product.isAvailable ? "#2ECC71" : "#F44336",
                    }}
                  >
                    {product.isAvailable ? "En ligne" : "Désactivé"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Avis clients — historique complet (visibles ET masqués par
            modération) puisque c'est une vue admin, miroir de la section
            équivalente dans RiderDetailModal côté livreur. */}
        <div className="mb-6">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gris">💬 Avis clients</h3>
          {reviewsStatus === "loading" ? (
            <p className="rounded-sm bg-gris-light p-4 text-sm text-gris">Chargement des avis...</p>
          ) : reviewsStatus === "error" ? (
            <p className="rounded-sm bg-gris-light p-4 text-sm text-red-500">Impossible de charger les avis.</p>
          ) : reviews.length === 0 ? (
            <p className="rounded-sm bg-gris-light p-4 text-sm text-gris">Aucun avis pour le moment.</p>
          ) : (
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto rounded-sm bg-gris-light p-3">
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
                        <Star size={11} fill="#FF6B35" color="#FF6B35" /> {review.proRating}
                      </span>
                    </div>
                    {review.proComment && <p className="text-xs text-gris">{review.proComment}</p>}
                    {review.proReply && (
                      <div className="mt-1.5 rounded-sm bg-gris-light p-2">
                        <p className="mb-0.5 text-[10px] font-semibold text-golfe-green">Réponse du commerçant</p>
                        <p className="text-xs text-gris">{review.proReply}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mb-6">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gris">⚙️ Changer le statut</h3>
          <div className="flex flex-wrap gap-2">
            {(["PENDING", "ACTIVE", "SUSPENDED", "CLOSED"] as ProStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleStatusChange(s)}
                disabled={saving || status === s}
                className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-default"
                style={{
                  backgroundColor: status === s ? PRO_STATUS_LABELS[s].bg : "#F3F4F6",
                  color: status === s ? PRO_STATUS_LABELS[s].text : "#6B7280",
                }}
              >
                {PRO_STATUS_LABELS[s].label}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="mb-4 rounded-sm bg-red-50 p-3 text-sm text-red-500">{error}</div>}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-gris-light px-4 py-2 text-sm font-semibold text-gris"
          >
            Fermer
          </button>
        </div>
      </div>

      {selectedProduct && (
        <AdminProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onToggle={(isAvailable) => handleToggleProduct(selectedProduct.id, isAvailable)}
        />
      )}

      {showCategoryManager && (
        <AdminCategoryManagerModal
          proId={pro.id}
          categories={categoriesWithCounts}
          onClose={() => setShowCategoryManager(false)}
          onRenamed={reloadProducts}
        />
      )}
    </div>
  );
}
