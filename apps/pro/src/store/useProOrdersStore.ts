import { create } from "zustand";
import { OrderStatus, type Order } from "@golfeexpress/types";
import { fetchMyShopOrders, updateOrderStatus } from "@/services/ordersApi";

interface ProOrdersState {
  orders: Order[];
  status: "idle" | "loading" | "loaded" | "error";
  error: string | null;

  loadOrders: () => Promise<void>;
  advanceStatus: (orderId: string, nextStatus: OrderStatus) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
}

export const useProOrdersStore = create<ProOrdersState>((set, get) => ({
  orders: [],
  status: "idle",
  error: null,

  loadOrders: async () => {
    set({ status: "loading", error: null });
    try {
      const orders = await fetchMyShopOrders();
      set({ orders, status: "loaded" });
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : "Impossible de charger les commandes." });
    }
  },

  advanceStatus: async (orderId, nextStatus) => {
    const updated = await updateOrderStatus(orderId, nextStatus);
    set((state) => ({
      orders: state.orders.map((o) => (o.id === orderId ? updated : o)),
    }));
  },

  cancelOrder: async (orderId) => {
    const updated = await updateOrderStatus(orderId, OrderStatus.CANCELLED);
    set((state) => ({
      orders: state.orders.map((o) => (o.id === orderId ? updated : o)),
    }));
  },
}));
