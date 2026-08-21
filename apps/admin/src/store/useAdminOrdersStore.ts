import { create } from "zustand";
import type { Order } from "@golfeexpress/types";
import { fetchAllOrders } from "@/services/ordersApi";

interface AdminOrdersState {
  orders: Order[];
  status: "idle" | "loading" | "loaded" | "error";
  error: string | null;

  loadOrders: () => Promise<void>;
}

export const useAdminOrdersStore = create<AdminOrdersState>((set) => ({
  orders: [],
  status: "idle",
  error: null,

  loadOrders: async () => {
    set({ status: "loading", error: null });
    try {
      const orders = await fetchAllOrders();
      set({ orders, status: "loaded" });
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : "Impossible de charger les commandes." });
    }
  },
}));