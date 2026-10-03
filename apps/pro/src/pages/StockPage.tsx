import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Search } from "lucide-react";
import { fetchStock, setStockAvailability, type StockProduct } from "@/services/stockApi";
import { ApiRequestError } from "@/services/apiClient";

/**
 * Page "Stock" -- volontairement accessible aussi aux comptes employés
 * (role PRO_EMPLOYEE, voir EMPLOYEE_ALLOWED_PAGES dans App.tsx et
 * EMPLOYEE_NAV_KEYS dans Sidebar.tsx), contrairement à Menu/Finances/
 * Abonnement/Avis/Réglages. Permet de cocher en rupture un produit entier
 * ou un choix d'option précis ("ingrédient", ex: "plus de mâche") sans
 * passer par la fiche produit complète (ProductFormModal.tsx, réservée au
 * patron). Quand un employé bascule un article, le patron est alerté
 * automatiquement côté serveur (voir PATCH /api/pros/me/stock côté
 * apps/api) -- rien à faire ici de plus que l'appel API.
 */
export function StockPage() {
  const [products, setProducts] = useState<StockProduct[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      setProducts(await fetchStock());
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiRequestError ? err.message : "Impossible de charger le stock.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!products) return null;
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.options.some((o) => o.choices.some((c) => c.name.toLowerCase().includes(q)))
    );
  }, [products, search]);

  function toggleExpanded(productId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  async function toggleProduct(product: StockProduct) {
    setBusyId(product.id);
    try {
      const nextAvailable = !product.isAvailable;
      await setStockAvailability("product", product.id, nextAvailable);
      setProducts(
        (prev) =>
          prev?.map((p) =>
            p.id === product.id ? { ...p, isAvailable: nextAvailable, unavailableUntil: null } : p
          ) ?? null
      );
    } catch {
      setLoadError("Impossible de modifier ce produit pour le moment.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleChoice(productId: string, groupId: string, choiceId: string, current: boolean) {
    setBusyId(choiceId);
    try {
      const nextAvailable = !current;
      await setStockAvailability("optionChoice", choiceId, nextAvailable);
      setProducts(
        (prev) =>
          prev?.map((p) =>
            p.id !== productId
              ? p
              : {
                  ...p,
                  options: p.options.map((o) =>
                    o.id !== groupId
                      ? o
                      : {
                          ...o,
                          choices: o.choices.map((c) =>
                            c.id === choiceId ? { ...c, isAvailable: nextAvailable, unavailableUntil: null } : c
                          ),
                        }
                  ),
                }
          ) ?? null
      );
    } catch {
      setLoadError("Impossible de modifier ce choix pour le moment.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold text-nuit">Stock</h1>
        <p className="mt-1 text-sm text-gris">
          Cochez un produit ou un choix précis (ex: un ingrédient) en rupture — il disparaît aussitôt pour les
          clients. Remettez-le disponible dès qu'il l'est de nouveau.
        </p>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-sm border border-gris-light bg-white px-3 py-2.5">
        <Search size={16} className="text-gris" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un produit ou un ingrédient..."
          className="w-full border-none text-sm text-nuit outline-none"
        />
      </div>

      {loadError && <p className="mb-4 text-sm font-medium text-[#E74C3C]">{loadError}</p>}

      {filtered === null ? (
        <p className="text-sm text-gris">Chargement...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-sm border border-dashed border-gris-light p-8 text-center text-sm text-gris">
          Aucun produit trouvé.
        </div>
      ) : (
        <div className="overflow-hidden rounded-sm border border-gris-light bg-white">
          {filtered.map((product, idx) => {
            const hasOptions = product.options.some((o) => o.choices.length > 0);
            const isOpen = expanded.has(product.id);
            return (
              <div key={product.id} style={{ borderTop: idx === 0 ? "none" : "1px solid #F0F0F0" }}>
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
                  <button
                    onClick={() => hasOptions && toggleExpanded(product.id)}
                    className="flex min-w-0 max-w-full items-center gap-2 text-left"
                    disabled={!hasOptions}
                  >
                    {hasOptions ? (
                      isOpen ? (
                        <ChevronDown size={16} className="shrink-0 text-gris" />
                      ) : (
                        <ChevronRight size={16} className="shrink-0 text-gris" />
                      )
                    ) : (
                      <span className="w-4 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-nuit">{product.name}</p>
                      <p className="truncate text-xs text-gris">{product.category}</p>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    {!product.isAvailable && (
                      <span
                        className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
                        style={{ backgroundColor: "rgba(255,107,53,0.1)", color: "#FF6B35" }}
                      >
                        <AlertTriangle size={12} /> En rupture
                      </span>
                    )}
                    <button
                      onClick={() => toggleProduct(product)}
                      disabled={busyId === product.id}
                      className="rounded-sm px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: product.isAvailable ? "#1A1A2E" : "#2ECC71" }}
                    >
                      {product.isAvailable ? "Marquer en rupture" : "Remettre disponible"}
                    </button>
                  </div>
                </div>

                {isOpen && hasOptions && (
                  <div className="bg-gris-light/40 px-4 pb-3 sm:px-5">
                    {product.options.map((group) =>
                      group.choices.length === 0 ? null : (
                        <div key={group.id} className="py-2">
                          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gris">
                            {group.name}
                          </p>
                          {group.choices.map((choice) => (
                            <div
                              key={choice.id}
                              className="flex flex-wrap items-center justify-between gap-2 border-t border-gris-light/80 py-2 first:border-t-0"
                            >
                              <p className="text-sm text-nuit">{choice.name}</p>
                              <div className="flex items-center gap-2">
                                {!choice.isAvailable && (
                                  <span
                                    className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                                    style={{ backgroundColor: "rgba(255,107,53,0.1)", color: "#FF6B35" }}
                                  >
                                    <AlertTriangle size={11} /> Rupture
                                  </span>
                                )}
                                <button
                                  onClick={() => toggleChoice(product.id, group.id, choice.id, choice.isAvailable)}
                                  disabled={busyId === choice.id}
                                  className="rounded-sm px-2.5 py-1 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                                  style={{ backgroundColor: choice.isAvailable ? "#1A1A2E" : "#2ECC71" }}
                                >
                                  {choice.isAvailable ? "Rupture" : "Disponible"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
