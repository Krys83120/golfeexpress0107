import React from "react";
import { X } from "lucide-react";
import type { Product } from "@golfeexpress/types";

interface AdminProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onToggle: (isAvailable: boolean) => void;
}

export function AdminProductDetailModal({ product, onClose, onToggle }: AdminProductDetailModalProps) {
  const isPhoto = !!product.image && product.image.startsWith("http");

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="font-heading text-lg font-bold text-nuit">{product.name}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-gris-light">
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 h-48 w-full overflow-hidden rounded-sm bg-gris-light">
          {isPhoto ? (
            <img src={product.image!} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl">{product.image ?? "🍽️"}</div>
          )}
        </div>

        <div className="mb-4 flex items-center justify-between">
          <span className="rounded-full bg-gris-light px-2.5 py-1 text-xs font-semibold text-nuit">{product.category}</span>
          <span className="font-heading text-lg font-bold text-golfe-green">{Number(product.price).toFixed(2)} €</span>
        </div>

        {product.description && <p className="mb-4 text-sm text-gris">{product.description}</p>}

        {product.options && product.options.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gris">Options</p>
            {product.options.map((group) => (
              <div key={group.id} className="mb-2 rounded-sm bg-gris-light p-3">
                <p className="mb-1 text-sm font-semibold text-nuit">
                  {group.name} {group.isRequired && <span className="text-corail">*obligatoire</span>}
                </p>
                {group.choices.map((choice) => (
                  <p key={choice.id} className="text-xs text-gris">
                    • {choice.name} {choice.priceModifier > 0 && `(+${Number(choice.priceModifier).toFixed(2)} €)`}
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onToggle(!product.isAvailable)}
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold"
            style={{
              backgroundColor: product.isAvailable ? "#E8F5E9" : "#FFEBEE",
              color: product.isAvailable ? "#2ECC71" : "#F44336",
            }}
          >
            {product.isAvailable ? "En ligne — cliquer pour désactiver" : "Désactivé — cliquer pour réactiver"}
          </button>
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
