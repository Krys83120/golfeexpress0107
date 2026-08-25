import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Copy, FolderCog, HelpCircle } from "lucide-react";
import { useProMenuStore } from "@/store/useProMenuStore";
import { useAuthStore } from "@/store/useAuthStore";
import { ProductFormModal } from "@/components/ProductFormModal";
import { CategoryManagerModal } from "@/components/CategoryManagerModal";
import { ProductTutorialModal } from "@/components/ProductTutorialModal";
import type { Product } from "@golfeexpress/types";

function ProductThumbnail({ image }: { image: string | null | undefined }) {
  const isPhoto = !!image && (image.startsWith("http://") || image.startsWith("https://"));
  return (
    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gris-light text-2xl">
      {isPhoto ? <img src={image!} alt="" className="h-full w-full object-cover" /> : (image ?? "🍽️")}
    </div>
  );
}

export function MenuPage() {
  const products = useProMenuStore((s) => s.products);
  const status = useProMenuStore((s) => s.status);
  const error = useProMenuStore((s) => s.error);
  const loadProducts = useProMenuStore((s) => s.loadProducts);
  const toggleAvailability = useProMenuStore((s) => s.toggleAvailability);
  const deleteProduct = useProMenuStore((s) => s.deleteProduct);
  const addProduct = useProMenuStore((s) => s.addProduct);
  const updateProduct = useProMenuStore((s) => s.updateProduct);
  const duplicateProduct = useProMenuStore((s) => s.duplicateProduct);
  const profile = useAuthStore((s) => s.profile);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  async function handleSave(data: Omit<Product, "id" | "proId">) {
    if (editingProduct) {
      await updateProduct(editingProduct.id, data);
      setEditingProduct(null);
    } else {
      await addProduct(data);
      setCreating(false);
    }
  }

  async function handleDelete(productId: string) {
    setDeleteError(null);
    try {
      await deleteProduct(productId);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Impossible de supprimer ce produit.");
    }
  }

  async function handleDuplicate(product: Product) {
    setDuplicating(product.id);
    try {
      const copy = await duplicateProduct(product);
      // Ouvre directement la copie en édition — il ne reste plus qu'à
      // changer la photo, le nom, la description et le prix.
      setEditingProduct(copy);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Impossible de dupliquer ce produit.");
    } finally {
      setDuplicating(null);
    }
  }

  // Catégories dérivées des produits réels plutôt qu'une liste statique
  // fermée — un Pro peut créer n'importe quelle catégorie (champ texte libre
  // côté schéma Product.category).
  const categories = Array.from(new Set(products.map((p) => p.category))).sort();
  const categoriesWithCounts = categories.map((name) => ({
    name,
    count: products.filter((p) => p.category === name).length,
  }));

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-nuit">Produits</h1>
          <p className="text-sm text-gris">{products.length} produits · {categories.length} catégories</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowTutorial(true)}
            className="flex items-center gap-2 rounded-sm border border-gris-light px-4 py-2.5 text-sm font-semibold text-nuit hover:bg-gris-light"
          >
            <HelpCircle size={16} />
            Tutoriel
          </button>
          <button
            onClick={() => setShowCategoryManager(true)}
            className="flex items-center gap-2 rounded-sm border border-gris-light px-4 py-2.5 text-sm font-semibold text-nuit hover:bg-gris-light"
          >
            <FolderCog size={16} />
            Gérer les catégories
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-sm bg-golfe-green px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus size={16} />
            Nouveau produit
          </button>
        </div>
      </div>

      {status === "error" && (
        <div className="mb-6 rounded-sm bg-red-50 p-4 text-sm text-red-500">
          {error}{" "}
          <button onClick={loadProducts} className="font-semibold underline">
            Réessayer
          </button>
        </div>
      )}

      {deleteError && (
        <div className="mb-6 flex items-center justify-between rounded-sm bg-red-50 p-4 text-sm text-red-500">
          <span>{deleteError}</span>
          <button onClick={() => setDeleteError(null)} className="ml-4 font-semibold underline">
            Fermer
          </button>
        </div>
      )}

      {status === "loading" && products.length === 0 && (
        <p className="py-12 text-center text-sm text-gris">Chargement du menu...</p>
      )}

      {status === "loaded" && products.length === 0 && (
        <div className="rounded border-2 border-dashed border-gris-light p-12 text-center">
          <p className="text-sm text-gris">Aucun produit pour le moment.</p>
          <button onClick={() => setCreating(true)} className="mt-2 text-sm font-semibold text-golfe-green">
            Ajouter votre premier produit
          </button>
          <p className="mt-3 text-xs text-gris">
            Pas encore sûr de comment faire ?{" "}
            <button onClick={() => setShowTutorial(true)} className="font-semibold text-nuit underline">
              Voir le tutoriel
            </button>
          </p>
        </div>
      )}

      {categories.map((category) => {
        const categoryProducts = products.filter((p) => p.category === category);
        if (categoryProducts.length === 0) return null;

        return (
          <div key={category} className="mb-6">
            <h3 className="mb-3 font-heading text-base font-bold text-nuit">{category}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categoryProducts.map((product) => (
                <div
                  key={product.id}
                  className="rounded bg-white p-4 shadow-sm"
                  style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)", opacity: product.isAvailable ? 1 : 0.5 }}
                >
                  <div className="mb-2 flex items-start justify-between">
                    <ProductThumbnail image={product.image} />
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDuplicate(product)}
                        disabled={duplicating === product.id}
                        title="Dupliquer"
                        className="rounded-sm p-1.5 text-gris hover:bg-gris-light disabled:opacity-50"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="rounded-sm p-1.5 text-gris hover:bg-gris-light"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="rounded-sm p-1.5 text-red-400 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="mb-1 flex items-center gap-2">
                    <p className="font-semibold text-nuit">{product.name}</p>
                    {product.isFeatured && <span className="text-xs">⭐</span>}
                  </div>
                  <p className="mb-3 line-clamp-2 text-xs text-gris">{product.description}</p>

                  <div className="flex items-center justify-between border-t border-gris-light pt-3">
                    <p className="font-bold text-golfe-green">{Number(product.price).toFixed(2)} €</p>
                    <div className="flex flex-col items-end gap-0.5">
                      <label className="flex items-center gap-1.5 text-xs text-gris">
                        <input
                          type="checkbox"
                          checked={product.isAvailable}
                          onChange={() => toggleAvailability(product.id)}
                        />
                        Disponible
                      </label>
                      {!product.isAvailable && (
                        <span className="text-[11px] text-gris">
                          {product.unavailableUntil ? "Revient demain" : "Jusqu'à nouvel ordre"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {(creating || editingProduct) && profile && (
        <ProductFormModal
          product={editingProduct}
          proId={profile.id}
          existingCategories={categories}
          onClose={() => {
            setCreating(false);
            setEditingProduct(null);
          }}
          onSave={handleSave}
        />
      )}

      {showCategoryManager && (
        <CategoryManagerModal
          categories={categoriesWithCounts}
          onClose={() => setShowCategoryManager(false)}
          onRenamed={loadProducts}
        />
      )}

      {showTutorial && <ProductTutorialModal onClose={() => setShowTutorial(false)} />}
    </div>
  );
}
