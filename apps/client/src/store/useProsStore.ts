import { create } from "zustand";
import { fetchPros, fetchProProducts, fetchProReviews, type ProWithUi } from "@/services/prosApi";
import type { Product, Review } from "@golfeexpress/types";

interface ProsState {
  pros: ProWithUi[];
  status: "idle" | "loading" | "loaded" | "error";
  error: string | null;

  productsByPro: Record<string, Product[]>;
  productsStatus: Record<string, "loading" | "loaded" | "error">;

  reviewsByPro: Record<string, Review[]>;
  reviewsStatus: Record<string, "loading" | "loaded" | "error">;

  loadPros: (params?: { userLat?: number; userLng?: number }) => Promise<void>;
  loadProductsForPro: (proId: string) => Promise<void>;
  loadReviewsForPro: (proId: string) => Promise<void>;
}

export const useProsStore = create<ProsState>((set, get) => ({
  pros: [],
  status: "idle",
  error: null,
  productsByPro: {},
  productsStatus: {},
  reviewsByPro: {},
  reviewsStatus: {},

  loadPros: async (params) => {
    set({ status: "loading", error: null });
    try {
      const pros = await fetchPros(params);
      set({ pros, status: "loaded" });
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : "Impossible de charger les commerçants." });
    }
  },

  loadProductsForPro: async (proId) => {
    // Évite de relancer un fetch si déjà chargé ou en cours.
    if (get().productsStatus[proId] === "loading" || get().productsStatus[proId] === "loaded") return;

    set((state) => ({ productsStatus: { ...state.productsStatus, [proId]: "loading" } }));
    try {
      const products = await fetchProProducts(proId);
      set((state) => ({
        productsByPro: { ...state.productsByPro, [proId]: products },
        productsStatus: { ...state.productsStatus, [proId]: "loaded" },
      }));
    } catch {
      set((state) => ({ productsStatus: { ...state.productsStatus, [proId]: "error" } }));
    }
  },

  loadReviewsForPro: async (proId) => {
    if (get().reviewsStatus[proId] === "loading" || get().reviewsStatus[proId] === "loaded") return;

    set((state) => ({ reviewsStatus: { ...state.reviewsStatus, [proId]: "loading" } }));
    try {
      const reviews = await fetchProReviews(proId);
      set((state) => ({
        reviewsByPro: { ...state.reviewsByPro, [proId]: reviews },
        reviewsStatus: { ...state.reviewsStatus, [proId]: "loaded" },
      }));
    } catch {
      set((state) => ({ reviewsStatus: { ...state.reviewsStatus, [proId]: "error" } }));
    }
  },
}));
