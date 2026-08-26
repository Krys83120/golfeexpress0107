import React, { useMemo, useState } from "react";
import { X, Plus, Trash2, Ban, Zap, ListPlus } from "lucide-react";
import type { Product, ProductOption } from "@golfeexpress/types";
import { ImageUploadField } from "@/components/ImageUploadField";
import { uploadProductImage, uploadProductGalleryImage, withCacheBust } from "@/services/uploadsApi";
import { updateProductOptions, type OptionGroupInput } from "@/services/productsApi";

interface ProductFormModalProps {
  product: Product | null; // null = création
  proId: string;
  /** Catégories déjà utilisées par ce Pro, proposées en suggestion (saisie libre sinon). */
  existingCategories: string[];
  /**
   * Tous les produits du Pro (avec leurs options) -- sert UNIQUEMENT à
   * proposer, au clic sur "+ Groupe", de réutiliser un groupe déjà
   * configuré sur un autre produit (ex: "La Taille" déjà créée sur une
   * autre pizza) plutôt que de le ressaisir entièrement. Voir
   * existingGroupsLibrary / addSelectedLibraryGroups ci-dessous.
   */
  allProducts: Product[];
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

/**
 * Retrouve la POSITION (groupIndex/choiceIndex dans `allOptions`) du choix
 * référencé par ProductOption.dependsOnChoiceId (un id réel, en base) --
 * c'est cette position, pas l'id, qui est envoyée au serveur (voir
 * OptionGroupInput.dependsOn et options/route.ts pour la résolution
 * inverse). null si non renseigné, ou si le choix référencé est introuvable
 * (dépendance orpheline -- filet de sécurité, ne devrait pas arriver).
 */
function resolveDependsOnPosition(
  dependsOnChoiceId: string | null | undefined,
  allOptions: ProductOption[]
): { groupIndex: number; choiceIndex: number } | null {
  if (!dependsOnChoiceId) return null;
  for (let groupIndex = 0; groupIndex < allOptions.length; groupIndex++) {
    const choiceIndex = allOptions[groupIndex].choices.findIndex((c) => c.id === dependsOnChoiceId);
    if (choiceIndex !== -1) return { groupIndex, choiceIndex };
  }
  return null;
}

function toOptionGroupInput(option: ProductOption, allOptions: ProductOption[]): OptionGroupInput {
  return {
    name: option.name,
    isRequired: option.isRequired,
    isMultiple: option.isMultiple,
    maxChoices: option.maxChoices ?? null,
    dependsOn: resolveDependsOnPosition(option.dependsOnChoiceId, allOptions),
    choices: option.choices.map((c) => ({
      name: c.name,
      priceModifier: c.priceModifier,
      // ?? true : les choix créés avant l'ajout de ce champ n'ont pas
      // encore cette valeur en base tant que le Pro ne les a pas
      // ré-enregistrés -- on les considère disponibles par défaut.
      isAvailable: c.isAvailable ?? true,
      unavailableUntil: c.unavailableUntil ?? null,
      // ?? false : même raison que isAvailable ci-dessus pour les choix
      // créés avant l'ajout de ce champ.
      allowMultipleQty: c.allowMultipleQty ?? false,
    })),
  };
}

/**
 * Nettoie les groupes/choix vides laissés en cours de saisie AVANT
 * l'enregistrement, en remappant chaque `dependsOn` (référence par
 * POSITION) vers les nouveaux index post-nettoyage -- sans ça, supprimer un
 * groupe/choix vide au milieu de la liste déciderait silencieusement un
 * `dependsOn` existant vers la mauvaise cible. Une dépendance dont la cible
 * a elle-même été supprimée (nom resté vide) est effacée (null) plutôt que
 * de pointer dans le vide.
 */
function cleanOptionGroupsForSave(groups: OptionGroupInput[]): OptionGroupInput[] {
  // Par groupe (ancien index) : ancien index de choix -> nouvel index de
  // choix, une fois les choix à nom vide retirés.
  const perGroupChoiceIndexMaps: Map<number, number>[] = groups.map((g) => {
    const map = new Map<number, number>();
    let newIndex = 0;
    g.choices.forEach((c, oldIndex) => {
      if (c.name.trim()) {
        map.set(oldIndex, newIndex);
        newIndex++;
      }
    });
    return map;
  });

  const cleanedChoicesPerGroup = groups.map((g) =>
    g.choices
      .filter((c) => c.name.trim())
      // "Quantité multiple" n'a de sens que pour un groupe à choix
      // multiples -- même garde que "Choix maxi" ci-dessous.
      .map((c) => ({ ...c, allowMultipleQty: g.isMultiple ? c.allowMultipleQty : false }))
  );

  // Un groupe survit s'il a un nom ET au moins un choix après nettoyage.
  const groupSurvives = groups.map((g, i) => !!g.name.trim() && cleanedChoicesPerGroup[i].length > 0);
  const oldToNewGroupIndex = new Map<number, number>();
  let nextGroupIndex = 0;
  groups.forEach((_, i) => {
    if (groupSurvives[i]) {
      oldToNewGroupIndex.set(i, nextGroupIndex);
      nextGroupIndex++;
    }
  });

  const result: OptionGroupInput[] = [];
  groups.forEach((g, i) => {
    if (!groupSurvives[i]) return;
    let dependsOn: OptionGroupInput["dependsOn"] = null;
    if (g.dependsOn) {
      const targetNewGroupIndex = oldToNewGroupIndex.get(g.dependsOn.groupIndex);
      const targetNewChoiceIndex = perGroupChoiceIndexMaps[g.dependsOn.groupIndex]?.get(g.dependsOn.choiceIndex);
      if (targetNewGroupIndex !== undefined && targetNewChoiceIndex !== undefined) {
        dependsOn = { groupIndex: targetNewGroupIndex, choiceIndex: targetNewChoiceIndex };
      }
    }
    result.push({
      ...g,
      name: g.name.trim(),
      // "Choix max" n'a de sens que pour un groupe à choix multiples -- on
      // l'ignore silencieusement si "Choix multiples" n'est pas coché
      // plutôt que de laisser une valeur orpheline sans effet visible.
      maxChoices: g.isMultiple ? g.maxChoices : null,
      dependsOn,
      choices: cleanedChoicesPerGroup[i],
    });
  });
  return result;
}

export function ProductFormModal({ product, proId, existingCategories, allProducts, onClose, onSave }: ProductFormModalProps) {
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
    product?.options?.map((o) => toOptionGroupInput(o, product.options!)) ?? []
  );
  const [allowSpecialInstructions, setAllowSpecialInstructions] = useState(product?.allowSpecialInstructions ?? false);
  const [hasExtraFeeNotice, setHasExtraFeeNotice] = useState(product?.hasExtraFeeNotice ?? false);
  const [savingOptions, setSavingOptions] = useState(false);
  const [optionsMessage, setOptionsMessage] = useState<string | null>(null);

  // "Bibliothèque" des groupes déjà configurés sur les AUTRES produits de ce
  // Pro (ex: "La Taille" déjà créée sur un poke, "La Base" sur un autre,
  // "Boisson" sur un burger déjà en "Seul / En Menu"...) -- proposée au
  // clic sur "+ Groupe" pour éviter de ressaisir un groupe identique à
  // chaque nouveau produit (voir addSelectedLibraryGroups ci-dessous).
  // Dédupliquée par NOM de groupe -- si plusieurs produits ont un groupe du
  // même nom configuré différemment, le dernier rencontré l'emporte
  // (approximation "version la plus à jour"), le Pro peut toujours ajuster
  // après import.
  //
  // IMPORTANT : un groupe n'est PAS forcément lié à "Formule" (Seul / En
  // Menu) -- "La Taille" ou "La Base" (ex: sur un poke) sont des groupes
  // normaux, indépendants, réutilisables tels quels sans rien exiger
  // d'autre. Seuls les groupes qui étaient RÉELLEMENT configurés comme
  // conditionnels sur leur produit d'origine (ProductOption.dependsOnChoiceId
  // -- ex: "Boisson"/"Accompagnement" dépendant de "Formule : En Menu")
  // portent une dépendance ici : on la retrouve par NOM (groupe + choix,
  // pas par id -- l'id d'origine n'a aucun sens sur ce produit-ci) en
  // cherchant, dans les groupes du MÊME produit d'origine, celui qui
  // contient le choix référencé.
  const existingGroupsLibrary = useMemo(() => {
    const byName = new Map<string, { option: ProductOption; dependsOnGroupName: string | null; dependsOnChoiceName: string | null }>();
    for (const p of allProducts) {
      if (p.id === product?.id) continue; // déjà visibles/modifiables juste en dessous, inutile de se proposer soi-même
      const groups = p.options ?? [];
      for (const group of groups) {
        let dependsOnGroupName: string | null = null;
        let dependsOnChoiceName: string | null = null;
        if (group.dependsOnChoiceId) {
          for (const candidate of groups) {
            const choice = candidate.choices.find((c) => c.id === group.dependsOnChoiceId);
            if (choice) {
              dependsOnGroupName = candidate.name;
              dependsOnChoiceName = choice.name;
              break;
            }
          }
        }
        byName.set(group.name, { option: group, dependsOnGroupName, dependsOnChoiceName });
      }
    }
    return Array.from(byName.values()).sort((a, b) => a.option.name.localeCompare(b.option.name, "fr"));
  }, [allProducts, product?.id]);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [selectedLibraryGroupNames, setSelectedLibraryGroupNames] = useState<Set<string>>(new Set());

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
      {
        name: "",
        isRequired: false,
        isMultiple: false,
        maxChoices: null,
        dependsOn: null,
        choices: [{ name: "", priceModifier: 0, isAvailable: true, unavailableUntil: null, allowMultipleQty: false }],
      },
    ]);
  }

  /**
   * Ajoute au produit courant les groupes cochés dans le panneau "+ Groupe"
   * (voir existingGroupsLibrary ci-dessus), en repartant d'une copie propre
   * -- jamais des ids/valeurs du produit d'origine, qui ne veulent rien dire
   * ici (même principe que duplicateProduct dans useProMenuStore.ts) :
   *  - une rupture de stock (isAvailable=false) sur le produit d'origine ne
   *    doit pas se propager au nouveau produit.
   *  - une éventuelle dépendance ("Groupe conditionnel", ex: "Boisson" qui
   *    dépend de "Formule : En Menu") est reconstruite par NOM plutôt que
   *    copiée telle quelle : le groupe qu'elle référence ("Formule") a
   *    forcément été coché en même temps (voir la case à cocher du
   *    panneau, qui l'ajoute automatiquement) ou est déjà présent sur ce
   *    produit -- IMPORTANT : le lot est d'abord réordonné pour que ce
   *    groupe "de base" soit toujours ajouté AVANT celui qui en dépend,
   *    sinon le serveur (updateProductOptionsSchema) refuserait
   *    l'enregistrement (une dépendance doit toujours pointer vers un
   *    groupe défini plus tôt dans la liste).
   */
  function addSelectedLibraryGroups() {
    const selected = existingGroupsLibrary.filter((lg) => selectedLibraryGroupNames.has(lg.option.name));

    // Tri topologique simple : un groupe ne peut être placé que si le
    // groupe dont il dépend est déjà "résolu" (soit déjà présent sur ce
    // produit, soit déjà placé plus tôt dans ce même lot).
    const resolvedNames = new Set(optionGroups.map((g) => g.name));
    const remaining = [...selected];
    const ordered: typeof selected = [];
    let progress = true;
    while (remaining.length > 0 && progress) {
      progress = false;
      for (let i = remaining.length - 1; i >= 0; i--) {
        const lg = remaining[i];
        if (!lg.dependsOnGroupName || resolvedNames.has(lg.dependsOnGroupName)) {
          ordered.push(lg);
          resolvedNames.add(lg.option.name);
          remaining.splice(i, 1);
          progress = true;
        }
      }
    }
    // Filet de sécurité (ne devrait pas arriver grâce à l'auto-sélection en
    // cascade sur la case à cocher) : dépendance orpheline -- on ajoute
    // quand même le groupe, simplement sans sa dépendance, plutôt que de le
    // perdre silencieusement.
    ordered.push(...remaining);

    setOptionGroups((prev) => {
      const result = [...prev];
      for (const lg of ordered) {
        const g = lg.option;
        let dependsOn: OptionGroupInput["dependsOn"] = null;
        if (lg.dependsOnGroupName && lg.dependsOnChoiceName) {
          const targetGroupIndex = result.findIndex((rg) => rg.name === lg.dependsOnGroupName);
          const targetChoiceIndex =
            targetGroupIndex !== -1 ? result[targetGroupIndex].choices.findIndex((c) => c.name === lg.dependsOnChoiceName) : -1;
          if (targetGroupIndex !== -1 && targetChoiceIndex !== -1) {
            dependsOn = { groupIndex: targetGroupIndex, choiceIndex: targetChoiceIndex };
          }
        }
        result.push({
          name: g.name,
          isRequired: g.isRequired,
          isMultiple: g.isMultiple,
          maxChoices: g.maxChoices ?? null,
          dependsOn,
          choices: g.choices.map((c) => ({
            name: c.name,
            priceModifier: c.priceModifier,
            isAvailable: true,
            unavailableUntil: null,
            allowMultipleQty: c.allowMultipleQty ?? false,
          })),
        });
      }
      return result;
    });
  }

  /**
   * Raccourci "Seul / En Menu" : pré-remplit d'un coup les 3 groupes
   * typiques d'un produit vendu seul OU en menu (ex: burger seul, ou avec
   * boisson + accompagnement), avec la dépendance conditionnelle déjà
   * câblée (Boisson/Accompagnement -> Formule : "En Menu") -- le Pro n'a
   * plus qu'à ajuster les noms/prix des choix (déjà éditables juste en
   * dessous) plutôt que de recréer 3 groupes et leurs dépendances à la main
   * à chaque nouveau produit. Uniquement proposé tant qu'aucune option n'a
   * encore été ajoutée (voir son emplacement dans le JSX ci-dessous) --
   * remplacerait sinon silencieusement des groupes déjà en cours de saisie.
   */
  function applySeulEnMenuPreset() {
    setOptionGroups([
      {
        name: "Formule",
        isRequired: true,
        isMultiple: false,
        maxChoices: null,
        dependsOn: null,
        choices: [
          { name: "Seul", priceModifier: 0, isAvailable: true, unavailableUntil: null, allowMultipleQty: false },
          { name: "En Menu", priceModifier: 3.5, isAvailable: true, unavailableUntil: null, allowMultipleQty: false },
        ],
      },
      {
        name: "Boisson",
        isRequired: true,
        isMultiple: false,
        maxChoices: null,
        // Position 0-1 = le choix "En Menu" ci-dessus (voir OptionGroupInput.dependsOn).
        dependsOn: { groupIndex: 0, choiceIndex: 1 },
        choices: [
          { name: "Coca-Cola", priceModifier: 0, isAvailable: true, unavailableUntil: null, allowMultipleQty: false },
          { name: "Eau", priceModifier: 0, isAvailable: true, unavailableUntil: null, allowMultipleQty: false },
        ],
      },
      {
        name: "Accompagnement",
        isRequired: true,
        isMultiple: false,
        maxChoices: null,
        dependsOn: { groupIndex: 0, choiceIndex: 1 },
        choices: [
          { name: "Frites", priceModifier: 0, isAvailable: true, unavailableUntil: null, allowMultipleQty: false },
          { name: "Salade", priceModifier: 0, isAvailable: true, unavailableUntil: null, allowMultipleQty: false },
        ],
      },
    ]);
  }

  function updateGroup(index: number, patch: Partial<OptionGroupInput>) {
    setOptionGroups((prev) => prev.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  }

  function removeGroup(index: number) {
    setOptionGroups((prev) =>
      prev
        .map((g, i) => {
          if (i === index) return null; // marqué pour suppression, filtré ci-dessous
          if (!g.dependsOn) return g;
          // Le groupe dont dépendait ce groupe vient d'être supprimé -- la
          // dépendance n'a plus de sens, on l'efface plutôt que de la
          // laisser pointer vers une position qui n'existe plus.
          if (g.dependsOn.groupIndex === index) return { ...g, dependsOn: null };
          // Tous les groupes situés APRÈS celui supprimé reculent d'une
          // position -- toute dépendance qui les référence doit suivre.
          if (g.dependsOn.groupIndex > index) {
            return { ...g, dependsOn: { ...g.dependsOn, groupIndex: g.dependsOn.groupIndex - 1 } };
          }
          return g;
        })
        .filter((g): g is OptionGroupInput => g !== null)
    );
  }

  function addChoice(groupIndex: number) {
    setOptionGroups((prev) =>
      prev.map((g, i) =>
        i === groupIndex
          ? {
              ...g,
              choices: [
                ...g.choices,
                { name: "", priceModifier: 0, isAvailable: true, unavailableUntil: null, allowMultipleQty: false },
              ],
            }
          : g
      )
    );
  }

  function updateChoice(
    groupIndex: number,
    choiceIndex: number,
    patch: Partial<{
      name: string;
      priceModifier: number;
      isAvailable: boolean;
      unavailableUntil: string | null;
      allowMultipleQty: boolean;
    }>
  ) {
    setOptionGroups((prev) =>
      prev.map((g, i) =>
        i === groupIndex ? { ...g, choices: g.choices.map((c, ci) => (ci === choiceIndex ? { ...c, ...patch } : c)) } : g
      )
    );
  }

  function removeChoice(groupIndex: number, choiceIndex: number) {
    setOptionGroups((prev) =>
      prev.map((g, i) => {
        const choices = i === groupIndex ? g.choices.filter((_, ci) => ci !== choiceIndex) : g.choices;
        // Un groupe conditionnel qui dépend PRÉCISÉMENT du choix supprimé
        // perd sa dépendance (cible disparue) ; s'il dépend d'un choix situé
        // après dans le même groupe, sa position doit reculer d'un cran.
        let dependsOn = g.dependsOn;
        if (dependsOn && dependsOn.groupIndex === groupIndex) {
          if (dependsOn.choiceIndex === choiceIndex) {
            dependsOn = null;
          } else if (dependsOn.choiceIndex > choiceIndex) {
            dependsOn = { ...dependsOn, choiceIndex: dependsOn.choiceIndex - 1 };
          }
        }
        return { ...g, choices, dependsOn };
      })
    );
  }

  async function handleSaveOptions() {
    if (!product) return;
    setSavingOptions(true);
    setOptionsMessage(null);
    try {
      // Filtre les groupes/choix vides laissés en cours de saisie (plutôt
      // que d'obliger à les supprimer manuellement avant d'enregistrer) ET
      // remappe les dependsOn en conséquence -- voir cleanOptionGroupsForSave.
      const cleaned = cleanOptionGroupsForSave(optionGroups);
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
                onClick={() => {
                  // Rien à réutiliser (premier produit du Pro, ou aucun
                  // autre produit n'a d'options) -- comportement inchangé,
                  // on ajoute directement un groupe vide.
                  if (existingGroupsLibrary.length === 0) {
                    addOptionGroup();
                  } else {
                    setShowGroupPicker(true);
                  }
                }}
                className="flex items-center gap-1 rounded-sm border border-gris-light px-2.5 py-1.5 text-xs font-semibold text-nuit hover:bg-gris-light"
              >
                <Plus size={13} /> Groupe
              </button>
            </div>

            {showGroupPicker && (
              <div className="mb-4 rounded-sm border border-golfe-green/40 bg-golfe-green/5 p-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <ListPlus size={14} className="text-golfe-green" />
                  <p className="text-xs font-semibold text-nuit">
                    Réutiliser un groupe déjà créé sur un autre produit ?
                  </p>
                </div>
                <p className="mb-2 text-[11px] text-gris">
                  Cochez un ou plusieurs groupes pour les ajouter tels quels à ce produit, sans les ressaisir.
                </p>
                <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
                  {existingGroupsLibrary.map((group) => {
                    // Un groupe déjà présent sur CE produit (ajouté à la
                    // main, ou via le modèle "Seul / En Menu") compte comme
                    // "de base" satisfaite -- pas besoin de le re-cocher.
                    const alreadyOnProduct = new Set(optionGroups.map((g) => g.name));
                    return (
                      <label key={group.option.name} className="flex items-start gap-2 text-xs text-nuit">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={selectedLibraryGroupNames.has(group.option.name)}
                          onChange={(e) =>
                            setSelectedLibraryGroupNames((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) {
                                next.add(group.option.name);
                                // Le groupe "de base" (ex: "Formule") dont
                                // dépend celui-ci doit être chargé AVANT lui
                                // -- coché automatiquement en cascade s'il
                                // n'est pas déjà présent sur ce produit,
                                // pour ne jamais charger un groupe
                                // conditionnel orphelin de sa dépendance.
                                let depName = group.dependsOnGroupName;
                                while (depName && !alreadyOnProduct.has(depName) && !next.has(depName)) {
                                  next.add(depName);
                                  const depEntry = existingGroupsLibrary.find((lg) => lg.option.name === depName);
                                  depName = depEntry?.dependsOnGroupName ?? null;
                                }
                              } else {
                                next.delete(group.option.name);
                                // Si on décoche un groupe "de base", on
                                // décoche en cascade tout groupe encore
                                // sélectionné qui en dépend (directement ou
                                // indirectement) -- sinon on chargerait un
                                // groupe conditionnel sans sa dépendance.
                                const cascadeUncheck = (name: string) => {
                                  for (const lg of existingGroupsLibrary) {
                                    if (lg.dependsOnGroupName === name && next.has(lg.option.name)) {
                                      next.delete(lg.option.name);
                                      cascadeUncheck(lg.option.name);
                                    }
                                  }
                                };
                                cascadeUncheck(group.option.name);
                              }
                              return next;
                            })
                          }
                        />
                        <span>
                          <span className="font-semibold">{group.option.name}</span>
                          <span className="text-gris"> — {group.option.choices.map((c) => c.name).join(", ")}</span>
                          {group.dependsOnGroupName && (
                            <span className="ml-1 text-golfe-green">
                              (nécessite "{group.dependsOnGroupName} : {group.dependsOnChoiceName}"
                              {!alreadyOnProduct.has(group.dependsOnGroupName) ? ", coché automatiquement" : ""})
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      addSelectedLibraryGroups();
                      setShowGroupPicker(false);
                      setSelectedLibraryGroupNames(new Set());
                    }}
                    disabled={selectedLibraryGroupNames.size === 0}
                    className="rounded-sm bg-golfe-green px-3 py-1.5 text-xs font-semibold text-nuit disabled:opacity-50"
                  >
                    Ajouter{selectedLibraryGroupNames.size > 0 ? ` (${selectedLibraryGroupNames.size})` : ""}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      addOptionGroup();
                      setShowGroupPicker(false);
                      setSelectedLibraryGroupNames(new Set());
                    }}
                    className="rounded-sm border border-gris-light px-3 py-1.5 text-xs font-semibold text-nuit hover:bg-gris-light"
                  >
                    Créer un groupe vide à la place
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowGroupPicker(false);
                      setSelectedLibraryGroupNames(new Set());
                    }}
                    className="rounded-sm px-3 py-1.5 text-xs font-semibold text-gris hover:bg-gris-light"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {optionGroups.length === 0 && (
              <div className="mb-3 flex flex-col gap-2.5 rounded-sm bg-sable p-3">
                <p className="text-xs text-gris">
                  Aucune option pour ce produit. Ajoutez un groupe (ex: "La taille") pour proposer des variantes avec
                  supplément de prix, comme dans l'exemple ci-contre.
                </p>
                <button
                  type="button"
                  onClick={applySeulEnMenuPreset}
                  className="flex items-center justify-center gap-1.5 self-start rounded-sm border border-golfe-green bg-golfe-green/10 px-3 py-1.5 text-xs font-semibold text-golfe-green hover:bg-golfe-green/20"
                >
                  <Zap size={13} /> Utiliser le modèle "Seul / En Menu"
                </button>
                <p className="text-[11px] text-gris">
                  Pré-remplit "Formule" (Seul / En Menu), "Boisson" et "Accompagnement" avec la dépendance déjà
                  réglée — il ne reste qu'à ajuster les noms et prix.
                </p>
              </div>
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

                  {groupIndex > 0 && (
                    <div className="mb-3">
                      <label className="mb-1 block text-xs font-semibold text-nuit">
                        Groupe conditionnel
                        <span className="ml-1 font-normal text-gris">
                          (n'apparaît que si ce choix est sélectionné)
                        </span>
                      </label>
                      <select
                        value={group.dependsOn ? `${group.dependsOn.groupIndex}-${group.dependsOn.choiceIndex}` : ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (!value) {
                            updateGroup(groupIndex, { dependsOn: null });
                            return;
                          }
                          const [gi, ci] = value.split("-").map(Number);
                          updateGroup(groupIndex, { dependsOn: { groupIndex: gi, choiceIndex: ci } });
                        }}
                        className="w-full rounded-sm border border-gris-light px-2.5 py-1.5 text-xs"
                      >
                        <option value="">Aucune (toujours affiché)</option>
                        {optionGroups.slice(0, groupIndex).map((earlierGroup, earlierGroupIndex) =>
                          earlierGroup.choices.map((choice, choiceIndex) => (
                            <option key={`${earlierGroupIndex}-${choiceIndex}`} value={`${earlierGroupIndex}-${choiceIndex}`}>
                              {earlierGroup.name || "(groupe sans nom)"} : {choice.name || "(choix sans nom)"}
                            </option>
                          ))
                        )}
                      </select>
                      {group.dependsOn && group.isRequired && (
                        <p className="mt-1 text-[11px] text-gris">
                          Obligatoire uniquement quand ce choix est sélectionné.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    {group.choices.map((choice, choiceIndex) => (
                      <div key={choiceIndex} className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
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
                            onClick={() =>
                              updateChoice(
                                groupIndex,
                                choiceIndex,
                                choice.isAvailable
                                  ? { isAvailable: false, unavailableUntil: null }
                                  : { isAvailable: true, unavailableUntil: null }
                              )
                            }
                            title={choice.isAvailable ? "Marquer en rupture" : "Choix en rupture — cliquer pour remettre disponible"}
                            className={`rounded-sm p-1 ${
                              choice.isAvailable ? "text-gris hover:bg-red-50 hover:text-red-500" : "bg-red-50 text-red-500"
                            }`}
                          >
                            <Ban size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeChoice(groupIndex, choiceIndex)}
                            className="rounded-sm p-1 text-gris hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {group.isMultiple && (
                          <label className="ml-1 flex items-center gap-1.5 text-[11px] text-nuit">
                            <input
                              type="checkbox"
                              checked={choice.allowMultipleQty ?? false}
                              onChange={(e) => updateChoice(groupIndex, choiceIndex, { allowMultipleQty: e.target.checked })}
                            />
                            Quantité multiple
                            <span className="text-gris">(le client peut en ajouter plusieurs, ex : "{choice.name || "Bacon"}" x4)</span>
                          </label>
                        )}

                        {!choice.isAvailable && (
                          <div className="ml-1 flex items-center gap-3 rounded-sm bg-sable px-2 py-1.5 text-[11px] text-nuit">
                            <span className="font-semibold text-red-500">En rupture</span>
                            <label className="flex items-center gap-1">
                              <input
                                type="radio"
                                name={`choice-unavail-${groupIndex}-${choiceIndex}`}
                                checked={!choice.unavailableUntil}
                                onChange={() => updateChoice(groupIndex, choiceIndex, { unavailableUntil: null })}
                              />
                              Jusqu'à nouvel ordre
                            </label>
                            <label className="flex items-center gap-1">
                              <input
                                type="radio"
                                name={`choice-unavail-${groupIndex}-${choiceIndex}`}
                                checked={!!choice.unavailableUntil}
                                onChange={() => updateChoice(groupIndex, choiceIndex, { unavailableUntil: tomorrowMidnightISO() })}
                              />
                              Aujourd'hui seulement
                            </label>
                          </div>
                        )}
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
