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
    const updated = await updateProductApi(productId, { isAvailable: !product.isAvailable });
    set((state) => ({ products: state.products.map((p) => (p.id === productId ? updated : p)) }));
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
    set((state) => ({ products: state.products.map((p) => (p.id === productId ? updated : p)) }));
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
      finalProduct = await updateProductOptions(
        created.id,
        product.options.map((o) => ({
          name: o.name,
          isRequired: o.isRequired,
          isMultiple: o.isMultiple,
          maxChoices: o.maxChoices ?? null,
          choices: o.choices.map((c) => ({ name: c.name, priceModifier: c.priceModifier })),
        }))
      );
    }

    set((state) => ({ products: [...state.products, finalProduct] }));
    return finalProduct;
  },
}));
