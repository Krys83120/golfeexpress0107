import React, { useState } from "react";
import { X, Pencil, Check } from "lucide-react";
import { renameAdminProductCategory } from "@/services/adminEntitiesApi";

interface AdminCategoryManagerModalProps {
  proId: string;
  categories: { name: string; count: number }[];
  onClose: () => void;
  onRenamed: () => void;
}

export function AdminCategoryManagerModal({ proId, categories, onClose, onRenamed }: AdminCategoryManagerModalProps) {
  const [editingName, setEditingName] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-nuit">Modérer les catégories</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-gris-light">
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-xs text-gris">
          Renommez une catégorie inappropriée ou mal orthographiée — tous les produits concernés sont mis à jour.
          Utiliser le nom d'une catégorie existante fusionne les deux.
        </p>

        <div className="flex flex-col gap-2">
          {categories.map((cat) => (
            <div key={cat.name} className="flex items-center gap-2 rounded-sm bg-gris-light px-3 py-2.5">
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
                  <span className="flex-1 text-sm font-medium text-nuit">{cat.name}</span>
                  <span className="text-xs text-gris">{cat.count} produit{cat.count > 1 ? "s" : ""}</span>
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
          ))}
          {categories.length === 0 && <p className="py-4 text-center text-sm text-gris">Aucune catégorie pour le moment.</p>}
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
