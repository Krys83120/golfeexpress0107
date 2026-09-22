import { create } from "zustand";
import type { Order } from "@golfeexpress/types";
import { fetchAllOrders } from "@/services/ordersApi";

interface AdminOrdersState {
  orders: Order[];
  status: "idle" | "loading" | "loaded" | "error";
  error: string | null;

  loadOrders: () => Promise<void>;
  /**
   * Remplace une commande précise dans `orders` par sa version à jour --
   * utilisé après une action Admin (mark-test / test-transition, voir
   * OrderDetailModal.tsx) pour refléter le changement instantanément sans
   * recharger toute la liste (évite un flash/rechargement complet du
   * Kanban à chaque clic sur un bouton de test).
   */
  updateOrderLocally: (order: Order) => void;
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

  updateOrderLocally: (order) => {
    set((state) => ({
      orders: state.orders.map((o) => (o.id === order.id ? order : o)),
    }));
  },
}));