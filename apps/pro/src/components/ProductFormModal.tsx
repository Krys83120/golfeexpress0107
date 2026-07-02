import React, { useState } from "react";
import { X } from "lucide-react";
import type { Product } from "@golfeexpress/types";
import { ImageUploadField } from "@/components/ImageUploadField";
import { uploadProductImage, withCacheBust } from "@/services/uploadsApi";

interface ProductFormModalProps {
  product: Product | null; // null = création
  proId: string;
  /** Catégories déjà utilisées par ce Pro, proposées en suggestion (saisie libre sinon). */
  existingCategories: string[];
  onClose: () => void;
  onSave: (data: Omit<Product, "id" | "proId">) => void;
}

function isLikelyPhotoUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

export function ProductFormModal({ product, proId, existingCategories, onClose, onSave }: ProductFormModalProps) {
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product?.price.toString() ?? "");
  const [category, setCategory] = useState(product?.category ?? existingCategories[0] ?? "");
  const [image, setImage] = useState(product?.image ?? "🍽️");
  const [isAvailable, setIsAvailable] = useState(product?.isAvailable ?? true);
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false);

  // Id stable utilisé comme nom de fichier pour la photo produit. En
  // édition, on utilise l'id réel du produit. En création (id pas encore
  // attribué par la base), on génère un id local — le chemin Storage est
  // simplement "{proId}/{cetId}.ext" et n'a pas besoin de correspondre à un
  // Product.id existant pour que l'upload fonctionne (les policies RLS ne
  // vérifient que l'appartenance du proId, pas l'existence du produit).
  const [draftImageId] = useState(() => product?.id ?? crypto.randomUUID());

  async function handleUploadPhoto(file: File) {
    const url = await uploadProductImage(proId, draftImageId, file);
    setImage(withCacheBust(url));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedPrice = parseFloat(price.replace(",", "."));
    if (!name.trim() || isNaN(parsedPrice)) return;
    onSave({
      name: name.trim(),
      description: description.trim() || null,
      price: parsedPrice,
      image,
      category,
      isAvailable,
      isFeatured,
    });
  }

  const usingPhoto = isLikelyPhotoUrl(image);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded bg-white p-6 shadow-xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-nuit">
            {product ? "Modifier le produit" : "Nouveau produit"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-gris-light">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gris">Photo</label>
              <ImageUploadField
                currentImageUrl={usingPhoto ? image : null}
                placeholder={usingPhoto ? "🍽️" : image}
                shape="square"
                onUpload={handleUploadPhoto}
              />
              {!usingPhoto && (
                <input
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  maxLength={2}
                  placeholder="🍽️"
                  className="mt-1.5 w-24 rounded-sm border border-gris-light px-2 py-1 text-center text-sm"
                />
              )}
              {usingPhoto && (
                <button
                  type="button"
                  onClick={() => setImage("🍽️")}
                  className="mt-1.5 text-[11px] font-medium text-gris underline"
                >
                  Revenir à un emoji
                </button>
              )}
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-gris">Nom du produit</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Poke Saumon"
                required
                className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gris">Description</label>
            <textarea
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ingrédients, particularités..."
              rows={2}
              className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-gris">Prix (€)</label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="14.90"
                required
                className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-gris">Catégorie</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                list="category-suggestions"
                placeholder="Ex: Poke Bowls"
                required
                className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
              />
              <datalist id="category-suggestions">
                {existingCategories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-nuit">
              <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
              Disponible
            </label>
            <label className="flex items-center gap-2 text-sm text-nuit">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
              Mettre en avant
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-gris-light px-4 py-2 text-sm font-semibold text-gris"
          >
            Annuler
          </button>
          <button type="submit" className="rounded-sm bg-golfe-green px-5 py-2 text-sm font-semibold text-white">
            {product ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </form>
    </div>
  );
}
