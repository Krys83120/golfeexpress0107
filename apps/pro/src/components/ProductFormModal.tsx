import React, { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import type { Product, ProductOption } from "@golfeexpress/types";
import { ImageUploadField } from "@/components/ImageUploadField";
import { uploadProductImage, uploadProductGalleryImage, withCacheBust } from "@/services/uploadsApi";
import { updateProductOptions, type OptionGroupInput } from "@/services/productsApi";

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

/**
 * Minuit (heure locale du navigateur, donc du Pro) au tout début de demain,
 * converti en ISO -- utilisé comme valeur de Product.unavailableUntil pour le
 * mode "Aujourd'hui seulement" : le job Cron quotidien
 * (/api/cron/reset-product-availability, ~1h/2h/3h du matin heure de Paris
 * selon la saison, donc toujours après ce minuit) remet le produit
 * disponible dès qu'il tourne après cette heure-là.
 */
function tomorrowMidnightISO(): string {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.toISOString();
}

const SUGGESTED_CATEGORIES = ["Menus", "Entrées", "Plats", "Poke Bowls", "Burgers", "Pizzas", "Salades", "Sandwichs", "Desserts", "Boissons", "Snacks"];

function toOptionGroupInput(option: ProductOption): OptionGroupInput {
  return {
    name: option.name,
    isRequired: option.isRequired,
    isMultiple: option.isMultiple,
    maxChoices: option.maxChoices ?? null,
    choices: option.choices.map((c) => ({ name: c.name, priceModifier: c.priceModifier })),
  };
}

export function ProductFormModal({ product, proId, existingCategories, onClose, onSave }: ProductFormModalProps) {
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product?.price.toString() ?? "");
  const [category, setCategory] = useState(product?.category ?? existingCategories[0] ?? "");
  const [image, setImage] = useState(product?.image ?? "🍽️");
  const [additionalImages, setAdditionalImages] = useState<string[]>(product?.additionalImages ?? []);
  const [uploadingGalleryPhoto, setUploadingGalleryPhoto] = useState(false);
  const [isAvailable, setIsAvailable] = useState(product?.isAvailable ?? true);
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false);
  const [unavailableUntil, setUnavailableUntil] = useState<string | null>(product?.unavailableUntil ?? null);
  // Choix affiché uniquement quand "Non disponible pour le moment" est coché
  // -- déduit de unavailableUntil pour un produit déjà en édition (une date
  // = "aujourd'hui seulement" a été choisi la dernière fois ; pas de date =
  // "jusqu'à nouvel ordre").
  const [unavailabilityMode, setUnavailabilityMode] = useState<"today" | "indefinite">(
    product?.unavailableUntil ? "today" : "indefinite"
  );

  const [optionGroups, setOptionGroups] = useState<OptionGroupInput[]>(
    product?.options?.map(toOptionGroupInput) ?? []
  );
  const [allowSpecialInstructions, setAllowSpecialInstructions] = useState(product?.allowSpecialInstructions ?? false);
  const [hasExtraFeeNotice, setHasExtraFeeNotice] = useState(product?.hasExtraFeeNotice ?? false);
  const [savingOptions, setSavingOptions] = useState(false);
  const [optionsMessage, setOptionsMessage] = useState<string | null>(null);

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

  async function handleAddGalleryPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de re-sélectionner le même fichier ensuite
    if (!file) return;
    setUploadingGalleryPhoto(true);
    try {
      const url = await uploadProductGalleryImage(proId, draftImageId, file);
      setAdditionalImages((prev) => [...prev, withCacheBust(url)]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Échec de l'upload.");
    } finally {
      setUploadingGalleryPhoto(false);
    }
  }

  function handleRemoveGalleryPhoto(index: number) {
    setAdditionalImages((prev) => prev.filter((_, i) => i !== index));
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
      additionalImages,
      category,
      isAvailable,
      isFeatured,
      unavailableUntil,
    });
  }

  function addOptionGroup() {
    setOptionGroups((prev) => [
      ...prev,
      { name: "", isRequired: false, isMultiple: false, maxChoices: null, choices: [{ name: "", priceModifier: 0 }] },
    ]);
  }

  function updateGroup(index: number, patch: Partial<OptionGroupInput>) {
    setOptionGroups((prev) => prev.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  }

  function removeGroup(index: number) {
    setOptionGroups((prev) => prev.filter((_, i) => i !== index));
  }

  function addChoice(groupIndex: number) {
    setOptionGroups((prev) =>
      prev.map((g, i) => (i === groupIndex ? { ...g, choices: [...g.choices, { name: "", priceModifier: 0 }] } : g))
    );
  }

  function updateChoice(groupIndex: number, choiceIndex: number, patch: Partial<{ name: string; priceModifier: number }>) {
    setOptionGroups((prev) =>
      prev.map((g, i) =>
        i === groupIndex ? { ...g, choices: g.choices.map((c, ci) => (ci === choiceIndex ? { ...c, ...patch } : c)) } : g
      )
    );
  }

  function removeChoice(groupIndex: number, choiceIndex: number) {
    setOptionGroups((prev) =>
      prev.map((g, i) => (i === groupIndex ? { ...g, choices: g.choices.filter((_, ci) => ci !== choiceIndex) } : g))
    );
  }

  async function handleSaveOptions() {
    if (!product) return;
    setSavingOptions(true);
    setOptionsMessage(null);
    try {
      // Filtre les groupes/choix vides laissés en cours de saisie plutôt
      // que d'obliger à les supprimer manuellement avant d'enregistrer.
      const cleaned = optionGroups
        .map((g) => ({
          ...g,
          name: g.name.trim(),
          // "Choix max" n'a de sens que pour un groupe à choix multiples --
          // on l'ignore silencieusement si "Choix multiples" n'est pas coché
          // plutôt que de laisser une valeur orpheline sans effet visible.
          maxChoices: g.isMultiple ? g.maxChoices : null,
          choices: g.choices.filter((c) => c.name.trim()),
        }))
        .filter((g) => g.name && g.choices.length > 0);
      await updateProductOptions(product.id, cleaned, { allowSpecialInstructions, hasExtraFeeNotice });
      setOptionGroups(cleaned);
      setOptionsMessage("✅ Options enregistrées.");
    } catch (err) {
      setOptionsMessage(err instanceof Error ? `❌ ${err.message}` : "❌ Erreur lors de l'enregistrement.");
    } finally {
      setSavingOptions(false);
    }
  }

  const usingPhoto = isLikelyPhotoUrl(image);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded bg-white p-6 shadow-xl">
        <form onSubmit={handleSubmit}>
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

            {usingPhoto && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-gris">Photos supplémentaires (galerie)</label>
                <div className="flex flex-wrap gap-2">
                  {additionalImages.map((url, index) => (
                    <div key={url} className="relative h-16 w-16 overflow-hidden rounded-sm border border-gris-light">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryPhoto(index)}
                        className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-sm border border-dashed border-gris-light text-gris hover:bg-gris-light">
                    {uploadingGalleryPhoto ? (
                      <span className="text-xs">...</span>
                    ) : (
                      <Plus size={16} />
                    )}
                    <input type="file" accept="image/*" onChange={handleAddGalleryPhoto} className="hidden" disabled={uploadingGalleryPhoto} />
                  </label>
                </div>
              </div>
            )}

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
                <select
                  value={SUGGESTED_CATEGORIES.includes(category) || existingCategories.includes(category) ? category : "__custom__"}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") setCategory("");
                    else setCategory(e.target.value);
                  }}
                  className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
                >
                  <option value="" disabled>
                    Choisir...
                  </option>
                  {[...new Set([...SUGGESTED_CATEGORIES, ...existingCategories])].map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__custom__">Autre (personnalisée)...</option>
                </select>
                {!SUGGESTED_CATEGORIES.includes(category) && !existingCategories.includes(category) && (
                  <input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Nom de la catégorie"
                    required
                    className="mt-1.5 w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
                  />
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="flex items-center gap-2 text-sm text-nuit">
                  <input
                    type="checkbox"
                    checked={!isAvailable}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setIsAvailable(false);
                        setUnavailabilityMode("indefinite");
                        setUnavailableUntil(null);
                      } else {
                        setIsAvailable(true);
                        setUnavailableUntil(null);
                      }
                    }}
                  />
                  Non disponible pour le moment
                  <span className="text-xs font-normal text-gris">(rupture de stock, etc.)</span>
                </label>

                {!isAvailable && (
                  <div className="mt-2 ml-6 flex flex-col gap-1.5 rounded-sm bg-sable p-2.5">
                    <label className="flex items-center gap-2 text-sm text-nuit">
                      <input
                        type="radio"
                        name="unavailability-duration"
                        checked={unavailabilityMode === "today"}
                        onChange={() => {
                          setUnavailabilityMode("today");
                          setUnavailableUntil(tomorrowMidnightISO());
                        }}
                      />
                      Aujourd'hui seulement <span className="text-xs text-gris">(redevient disponible demain)</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-nuit">
                      <input
                        type="radio"
                        name="unavailability-duration"
                        checked={unavailabilityMode === "indefinite"}
                        onChange={() => {
                          setUnavailabilityMode("indefinite");
                          setUnavailableUntil(null);
                        }}
                      />
                      Jusqu'à nouvel ordre <span className="text-xs text-gris">(à vous de le remettre disponible)</span>
                    </label>
                  </div>
                )}
              </div>

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

        {/* Les options (taille, base, sauce...) ne peuvent être gérées
            qu'une fois le produit créé — elles sont rattachées à son id
            réel côté base de données. */}
        {product ? (
          <div className="mt-6 border-t border-gris-light pt-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-heading text-sm font-bold text-nuit">🧩 Options (taille, base, sauce...)</h3>
              <button
                type="button"
                onClick={addOptionGroup}
                className="flex items-center gap-1 rounded-sm border border-gris-light px-2.5 py-1.5 text-xs font-semibold text-nuit hover:bg-gris-light"
              >
                <Plus size={13} /> Groupe
              </button>
            </div>

            {optionGroups.length === 0 && (
              <p className="mb-3 text-xs text-gris">
                Aucune option pour ce produit. Ajoutez un groupe (ex: "La taille") pour proposer des variantes avec
                supplément de prix, comme dans l'exemple ci-contre.
              </p>
            )}

            <div className="flex flex-col gap-4">
              {optionGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="rounded-sm border border-gris-light p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <input
                      value={group.name}
                      onChange={(e) => updateGroup(groupIndex, { name: e.target.value })}
                      placeholder="Ex: La taille"
                      className="flex-1 rounded-sm border border-gris-light px-2.5 py-1.5 text-sm font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => removeGroup(groupIndex)}
                      className="rounded-sm p-1.5 text-gris hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="mb-3 flex items-center gap-4">
                    <label className="flex items-center gap-1.5 text-xs text-nuit">
                      <input
                        type="checkbox"
                        checked={group.isRequired}
                        onChange={(e) => updateGroup(groupIndex, { isRequired: e.target.checked })}
                      />
                      Obligatoire
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-nuit">
                      <input
                        type="checkbox"
                        checked={group.isMultiple}
                        onChange={(e) => updateGroup(groupIndex, { isMultiple: e.target.checked })}
                      />
                      Choix multiples
                    </label>
                    {group.isMultiple && (
                      <label className="flex items-center gap-1.5 text-xs text-nuit">
                        Choix maxi
                        <input
                          type="number"
                          min={1}
                          placeholder="illimité"
                          value={group.maxChoices ?? ""}
                          onChange={(e) =>
                            updateGroup(groupIndex, { maxChoices: e.target.value ? Number(e.target.value) : null })
                          }
                          className="w-16 rounded-sm border border-gris-light px-1.5 py-1 text-xs"
                        />
                      </label>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {group.choices.map((choice, choiceIndex) => (
                      <div key={choiceIndex} className="flex items-center gap-1.5">
                        <input
                          value={choice.name}
                          onChange={(e) => updateChoice(groupIndex, choiceIndex, { name: e.target.value })}
                          placeholder="Ex: Medium"
                          className="flex-1 rounded-sm border border-gris-light px-2 py-1 text-xs"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gris">+</span>
                          <input
                            type="number"
                            step="0.5"
                            value={choice.priceModifier}
                            onChange={(e) => updateChoice(groupIndex, choiceIndex, { priceModifier: Number(e.target.value) || 0 })}
                            className="w-16 rounded-sm border border-gris-light px-1.5 py-1 text-xs"
                          />
                          <span className="text-xs text-gris">€</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeChoice(groupIndex, choiceIndex)}
                          className="rounded-sm p-1 text-gris hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addChoice(groupIndex)}
                      className="mt-1 flex items-center gap-1 self-start text-xs font-semibold text-golfe-green"
                    >
                      <Plus size={12} /> Ajouter un choix
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-2.5 border-t border-gris-light pt-4">
              <label className="flex items-start gap-2 text-sm text-nuit">
                <input
                  type="checkbox"
                  checked={allowSpecialInstructions}
                  onChange={(e) => setAllowSpecialInstructions(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Instructions spécifiques
                  <span className="block text-xs font-normal text-gris">
                    Le client pourra ajouter un commentaire libre à ce produit (ex: "bien cuit", "sans oignon").
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm text-nuit">
                <input
                  type="checkbox"
                  checked={hasExtraFeeNotice}
                  onChange={(e) => setHasExtraFeeNotice(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Frais supplémentaires possibles
                  <span className="block text-xs font-normal text-gris">
                    Affiche au client : "Des frais supplémentaires peuvent être appliqués pour cette option."
                  </span>
                </span>
              </label>
            </div>

            {optionsMessage && <p className="mt-3 text-xs">{optionsMessage}</p>}

            <button
              type="button"
              onClick={handleSaveOptions}
              disabled={savingOptions}
              className="mt-4 w-full rounded-sm bg-nuit px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {savingOptions ? "Enregistrement..." : "Enregistrer les options"}
            </button>
          </div>
        ) : (
          <p className="mt-6 border-t border-gris-light pt-4 text-xs text-gris">
            💡 Créez d'abord le produit — vous pourrez ensuite ajouter des options (taille, base, sauce...) en le
            modifiant.
          </p>
        )}
      </div>
    </div>
  );
}
