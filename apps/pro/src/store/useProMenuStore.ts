import { create } from "zustand";
import type { Product } from "@golfeexpress/types";
import { fetchMyProducts, createProduct, updateProduct as updateProductApi, deleteProductApi } from "@/services/productsApi";

type CreateProductInput = Omit<Product, "id" | "proId">;

interface ProMenuState {
  products: Product[];
  status: "idle" | "loading" | "loaded" | "error";
  error: string | null;

  loadProducts: () => Promise<void>;
  toggleAvailability: (productId: string) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addProduct: (product: CreateProductInput) => Promise<void>;
  updateProduct: (productId: string, updates: Partial<CreateProductInput>) => Promise<void>;
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
    await deleteProductApi(productId);
    set((state) => ({ products: state.products.filter((p) => p.id !== productId) }));
  },

  addProduct: async (product) => {
    const created = await createProduct(product);
    set((state) => ({ products: [...state.products, created] }));
  },

  updateProduct: async (productId, updates) => {
    const updated = await updateProductApi(productId, updates);
    set((state) => ({ products: state.products.map((p) => (p.id === productId ? updated : p)) }));
  },
}));
