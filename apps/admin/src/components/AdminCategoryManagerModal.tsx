import React, { useEffect, useRef, useState } from "react";
import { X, Pencil, Check, GripVertical, Camera, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import type { Product } from "@golfeexpress/types";
import {
  renameAdminProductCategory,
  fetchAdminCategories,
  reorderAdminCategories,
  uploadAdminCategoryImage,
  reorderAdminProducts,
  renameAdminProduct,
  uploadAdminProductImage,
  type AdminMenuCategoryRow,
} from "@/services/adminEntitiesApi";

interface AdminCategoryManagerModalProps {
  proId: string;
  /** Liste initiale (nom + nombre de produits, déjà connue du parent) — affichée pendant que ce modal charge sa propre liste (avec ordre/photo, voir fetchAdminCategories) pour éviter un écran vide. */
  categories: { name: string; count: number }[];
  /** Tous les produits du Pro — utilisé pour construire, catégorie par catégorie, la liste des "sous-catégories" (produits) réordonnable. */
  products: Product[];
  onClose: () => void;
  onRenamed: () => void;
}

/** Un produit tel qu'affiché/réordonné dans la liste dépliée d'une catégorie. */
interface CategoryRow extends AdminMenuCategoryRow {}

export function AdminCategoryManagerModal({ proId, categories, products, onClose, onRenamed }: AdminCategoryManagerModalProps) {
  const [rows, setRows] = useState<CategoryRow[]>(
    categories.map((c) => ({ name: c.name, count: c.count, image: null, sortOrder: null }))
  );
  const [loaded, setLoaded] = useState(false);

  const [editingName, setEditingName] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [productOrder, setProductOrder] = useState<Product[]>([]);

  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [draftProductName, setDraftProductName] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(null);
  const productFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const dragCategoryIndex = useRef<number | null>(null);
  const dragProductIndex = useRef<number | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminCategories(proId)
      .then((data) => {
        if (!cancelled) {
          setRows(data);
          setLoaded(true);
        }
      })
      .catch(() => {
        // La liste initiale (prop `categories`, sans ordre/photo) reste affichée en repli.
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [proId]);

  function startEditing(name: string) {
    setEditingName(name);
    setDraftName(name);
    setError(null);
  }

  async function handleSave(oldName: string) {
    const newName = draftName.trim();
    if (!newName || newName === oldName) {
      setEditingName(null);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await renameAdminProductCategory(proId, oldName, newName);
      setEditingName(null);
      onRenamed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de renommer cette catégorie.");
    } finally {
      setSaving(false);
    }
  }

  // Glisser-déposer catégories -- réécrit systématiquement l'ordre COMPLET
  // (voir reorderAdminCategories) dès le drop, avec mise à jour optimiste de
  // l'affichage ; un échec réseau revient à l'ordre précédent et affiche
  // l'erreur plutôt que de laisser l'écran désynchronisé du serveur.
  function handleCategoryDrop(dropIndex: number) {
    const fromIndex = dragCategoryIndex.current;
    dragCategoryIndex.current = null;
    if (fromIndex === null || fromIndex === dropIndex) return;

    const previous = rows;
    const next = [...rows];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(dropIndex, 0, moved);
    setRows(next);

    reorderAdminCategories(
      proId,
      next.map((c) => c.name)
    ).catch((err) => {
      setRows(previous);
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer le nouvel ordre.");
    });
  }

  function toggleExpanded(name: string) {
    if (expanded === name) {
      setExpanded(null);
      return;
    }
    setExpanded(name);
    const items = products
      .filter((p) => p.category === name)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, "fr"));
    setProductOrder(items);
  }

  function handleProductDrop(dropIndex: number) {
    const fromIndex = dragProductIndex.current;
    dragProductIndex.current = null;
    if (fromIndex === null || fromIndex === dropIndex) return;

    const previous = productOrder;
    const next = [...productOrder];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(dropIndex, 0, moved);
    setProductOrder(next);

    reorderAdminProducts(
      proId,
      next.map((p) => p.id)
    ).catch((err) => {
      setProductOrder(previous);
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer le nouvel ordre des produits.");
    });
  }

  async function handlePhotoChange(category: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploadingCategory(category);
    try {
      const image = await uploadAdminCategoryImage(proId, category, file);
      setRows((prev) => prev.map((c) => (c.name === category ? { ...c, image } : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'upload de la photo.");
    } finally {
      setUploadingCategory(null);
      const input = fileInputRefs.current[category];
      if (input) input.value = "";
    }
  }

  function startEditingProduct(product: Product) {
    setEditingProductId(product.id);
    setDraftProductName(product.name);
    setError(null);
  }

  async function handleSaveProductName(productId: string) {
    const current = productOrder.find((p) => p.id === productId);
    const newName = draftProductName.trim();
    if (!newName || !current || newName === current.name) {
      setEditingProductId(null);
      return;
    }
    setSavingProduct(true);
    setError(null);
    try {
      await renameAdminProduct(proId, productId, newName);
      setProductOrder((prev) => prev.map((p) => (p.id === productId ? { ...p, name: newName } : p)));
      setEditingProductId(null);
      onRenamed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de renommer ce produit.");
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleProductPhotoChange(productId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploadingProductId(productId);
    try {
      const image = await uploadAdminProductImage(proId, productId, file);
      setProductOrder((prev) => prev.map((p) => (p.id === productId ? { ...p, image } : p)));
      onRenamed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'upload de la photo.");
    } finally {
      setUploadingProductId(null);
      const input = productFileInputRefs.current[productId];
      if (input) input.value = "";
    }
  }

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-nuit">Gérer les catégories</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-gris-light">
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-xs text-gris">
          Glissez une catégorie (⠿) pour la réordonner, ou une catégorie dépliée pour réordonner ses produits.
          Renommez avec le crayon — utiliser le nom d'une catégorie existante fusionne les deux. La photo est
          optionnelle : sans elle, la vignette reprend la photo d'un produit, sinon un emoji générique. Une fois
          une catégorie dépliée, vous pouvez aussi renommer chaque produit et lui ajouter une photo.
        </p>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-2">
            {rows.map((cat, index) => (
              <div key={cat.name} className="rounded-sm bg-gris-light">
                <div
                  draggable={editingName !== cat.name}
                  onDragStart={() => (dragCategoryIndex.current = index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleCategoryDrop(index)}
                  className="flex items-center gap-2 px-3 py-2.5"
                >
                  <span className="cursor-grab text-gris" title="Glisser pour réordonner">
                    <GripVertical size={15} />
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleExpanded(cat.name)}
                    className="rounded-sm p-0.5 text-gris hover:bg-white"
                    title="Voir les produits de cette catégorie"
                  >
                    {expanded === cat.name ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[cat.name]?.click()}
                    disabled={uploadingCategory === cat.name}
                    className="group relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-dashed border-gris bg-white"
                    title="Ajouter/changer la photo de catégorie (optionnel)"
                  >
                    {cat.image ? (
                      <img src={cat.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Camera size={13} className="text-gris" />
                    )}
                    {uploadingCategory === cat.name && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 size={13} className="animate-spin text-white" />
                      </div>
                    )}
                  </button>
                  <input
                    ref={(el) => (fileInputRefs.current[cat.name] = el)}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => handlePhotoChange(cat.name, e)}
                    className="hidden"
                  />

                  {editingName === cat.name ? (
                    <>
                      <input
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && handleSave(cat.name)}
                        className="flex-1 rounded-sm border border-gris-light bg-white px-2 py-1 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleSave(cat.name)}
                        disabled={saving}
                        className="rounded-sm bg-golfe-green p-1.5 text-white disabled:opacity-60"
                      >
                        <Check size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 truncate text-sm font-medium text-nuit">{cat.name}</span>
                      <span className="text-xs text-gris">
                        {cat.count} produit{cat.count > 1 ? "s" : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEditing(cat.name)}
                        className="rounded-sm p-1.5 text-gris hover:bg-white"
                      >
                        <Pencil size={13} />
                      </button>
                    </>
                  )}
                </div>

                {expanded === cat.name && (
                  <div className="border-t border-white px-3 pb-2.5 pt-1.5">
                    {productOrder.length === 0 ? (
                      <p className="py-2 text-xs text-gris">Aucun produit.</p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {productOrder.map((product, pIndex) => (
                          <div
                            key={product.id}
                            draggable={editingProductId !== product.id}
                            onDragStart={() => (dragProductIndex.current = pIndex)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleProductDrop(pIndex)}
                            className="flex items-center gap-2 rounded-sm bg-white px-2.5 py-1.5"
                          >
                            <span className="cursor-grab text-gris" title="Glisser pour réordonner">
                              <GripVertical size={13} />
                            </span>

                            <button
                              type="button"
                              onClick={() => productFileInputRefs.current[product.id]?.click()}
                              disabled={uploadingProductId === product.id}
                              className="group relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-dashed border-gris bg-gris-light"
                              title="Ajouter/changer la photo du produit (optionnel)"
                            >
                              {product.image && product.image.startsWith("http") ? (
                                <img src={product.image} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Camera size={12} className="text-gris" />
                              )}
                              {uploadingProductId === product.id && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                  <Loader2 size={12} className="animate-spin text-white" />
                                </div>
                              )}
                            </button>
                            <input
                              ref={(el) => (productFileInputRefs.current[product.id] = el)}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(e) => handleProductPhotoChange(product.id, e)}
                              className="hidden"
                            />

                            {editingProductId === product.id ? (
                              <>
                                <input
                                  value={draftProductName}
                                  onChange={(e) => setDraftProductName(e.target.value)}
                                  autoFocus
                                  onKeyDown={(e) => e.key === "Enter" && handleSaveProductName(product.id)}
                                  className="flex-1 rounded-sm border border-gris-light bg-white px-2 py-1 text-[13px]"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveProductName(product.id)}
                                  disabled={savingProduct}
                                  className="rounded-sm bg-golfe-green p-1 text-white disabled:opacity-60"
                                >
                                  <Check size={12} />
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1 truncate text-[13px] text-nuit">{product.name}</span>
                                <span className="text-xs text-gris">{Number(product.price).toFixed(2)} €</span>
                                <button
                                  type="button"
                                  onClick={() => startEditingProduct(product)}
                                  className="rounded-sm p-1 text-gris hover:bg-gris-light"
                                  title="Renommer ce produit"
                                >
                                  <Pencil size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {loaded && rows.length === 0 && (
              <p className="py-4 text-center text-sm text-gris">Aucune catégorie pour le moment.</p>
            )}
          </div>
        </div>

        {error && <div className="mt-3 rounded-sm bg-red-50 p-3 text-sm text-red-500">{error}</div>}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-gris-light px-4 py-2 text-sm font-semibold text-gris"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
