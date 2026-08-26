import { create } from "zustand";
import type { Product } from "@golfeexpress/types";
import {
  fetchMyProducts,
  createProduct,
  updateProduct as updateProductApi,
  deleteProductApi,
  updateProductOptions,
} from "@/services/productsApi";

type CreateProductInput = Omit<Product, "id" | "proId">;

interface ProMenuState {
  products: Product[];
  status: "idle" | "loading" | "loaded" | "error";
  error: string | null;

  loadProducts: () => Promise<void>;
  toggleAvailability: (productId: string) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addProduct: (product: CreateProductInput) => Promise<Product>;
  updateProduct: (productId: string, updates: Partial<CreateProductInput>) => Promise<void>;
  /** Crée une copie d'un produit existant (même prix/description/photo/catégorie + mêmes options) — pratique pour ne pas ressaisir des options identiques sur un produit très proche. */
  duplicateProduct: (product: Product) => Promise<Product>;
}

export const useProMenuStore = create<ProMenuState>((set, get) => ({
  products: [],
  status: "idle",
  error: null,

  loadProducts: async () => {
    set({ status: "loading", error: null });
    try {
      const products = await fetchMyProducts();
      set({ products, status: "loaded" });
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : "Impossible de charger le menu." });
    }
  },

  toggleAvailability: async (productId) => {
    const product = get().products.find((p) => p.id === productId);
    if (!product) return;
    // On efface systématiquement unavailableUntil ici : ce toggle rapide
    // (case à cocher sur la liste) ne propose pas le choix "aujourd'hui
    // seulement" -- sans ce reset, une date restée en base depuis un
    // précédent réglage "aujourd'hui seulement" fait via la fiche produit
    // pourrait faire réapparaître le produit tout seul plus tard, alors que
    // le Pro l'a explicitement rendu indisponible via ce toggle-ci.
    const updated = await updateProductApi(productId, {
      isAvailable: !product.isAvailable,
      unavailableUntil: null,
    });
    // PATCH /products/[id] ne renvoie pas les options (route allégée, voir
    // serializeProductWithoutOptions côté API) -- sans ce fallback, ce toggle
    // rapide effaçait silencieusement les options du produit en mémoire
    // (elles restaient intactes en base, mais disparaissaient de l'écran
    // "Modifier le produit" tant que la page n'était pas rechargée).
    set((state) => ({
      products: state.products.map((p) =>
        p.id === productId ? { ...updated, options: updated.options ?? p.options } : p
      ),
    }));
  },

  deleteProduct: async (productId) => {
    // Se propage vers le composant appelant (MenuPage affiche l'erreur) —
    // sans ce throw, un échec (ex: produit déjà commandé, voir la route
    // DELETE) passait inaperçu : la requête échouait mais rien ne
    // prévenait le Pro, et le produit restait affiché sans explication.
    await deleteProductApi(productId);
    set((state) => ({ products: state.products.filter((p) => p.id !== productId) }));
  },

  addProduct: async (product) => {
    const created = await createProduct(product);
    set((state) => ({ products: [...state.products, created] }));
    return created;
  },

  updateProduct: async (productId, updates) => {
    const updated = await updateProductApi(productId, updates);
    // Même raison que dans toggleAvailability ci-dessus : le PATCH ne renvoie
    // pas les options, on garde donc celles déjà connues en mémoire plutôt
    // que de les effacer de l'écran.
    set((state) => ({
      products: state.products.map((p) =>
        p.id === productId ? { ...updated, options: updated.options ?? p.options } : p
      ),
    }));
  },

  duplicateProduct: async (product) => {
    const created = await createProduct({
      name: `Copie de ${product.name}`,
      description: product.description,
      price: product.price,
      image: product.image,
      category: product.category,
      isAvailable: product.isAvailable,
      isFeatured: false,
    });

    let finalProduct = created;
    if (product.options && product.options.length > 0) {
      const sourceOptions = product.options;
      finalProduct = await updateProductOptions(
        created.id,
        sourceOptions.map((o) => ({
          name: o.name,
          isRequired: o.isRequired,
          isMultiple: o.isMultiple,
          maxChoices: o.maxChoices ?? null,
          // La copie reçoit des id tout neufs pour ses groupes/choix (voir
          // options/route.ts, qui recrée tout à chaque sauvegarde) --
          // dependsOnChoiceId (id réel du produit SOURCE) ne peut donc pas
          // être réutilisé tel quel. On le reconvertit en position
          // (groupIndex/choiceIndex dans `sourceOptions`, structure
          // identique côté copie puisqu'on envoie les mêmes groupes dans le
          // même ordre) -- même format que ProductFormModal.tsx.
          dependsOn: (() => {
            if (!o.dependsOnChoiceId) return null;
            for (let groupIndex = 0; groupIndex < sourceOptions.length; groupIndex++) {
              const choiceIndex = sourceOptions[groupIndex].choices.findIndex((c) => c.id === o.dependsOnChoiceId);
              if (choiceIndex !== -1) return { groupIndex, choiceIndex };
            }
            return null;
          })(),
          // Une copie repart toujours disponible, même si le choix d'origine
          // était en rupture -- un "plus de mâche" sur le produit copié n'a
          // aucune raison de s'appliquer à la nouvelle fiche.
          choices: o.choices.map((c) => ({
            name: c.name,
            priceModifier: c.priceModifier,
            isAvailable: true,
            unavailableUntil: null,
            allowMultipleQty: c.allowMultipleQty ?? false,
          })),
        }))
      );
    }

    set((state) => ({ products: [...state.products, finalProduct] }));
    return finalProduct;
  },
}));
