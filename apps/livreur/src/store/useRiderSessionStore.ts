import { create } from "zustand";
import { OrderStatus, type Order } from "@golfeexpress/types";
import { acceptOrder, updateOrderStatus, setOnlineStatus, fetchAvailableOrders, fetchMyDeliveries } from "@/services/ridersApi";
import { useAuthStore } from "@/store/useAuthStore";

// Ordre de progression pour une livraison en cours, utilisé pour déterminer
// la prochaine action proposée au livreur (bouton "J'ai récupéré...", etc.)
const DELIVERY_FLOW: OrderStatus[] = [
  OrderStatus.RIDER_ASSIGNED,
  OrderStatus.PICKED_UP,
  OrderStatus.IN_DELIVERY,
  OrderStatus.DELIVERED,
];

interface RiderSessionState {
  isOnline: boolean;
  isTogglingOnline: boolean;
  toggleOnlineError: string | null;
  toggleOnline: () => Promise<void>;

  activeDelivery: Order | null;
  availableOrders: Order[];
  availableOrdersStatus: "idle" | "loading" | "loaded" | "error";

  loadAvailableOrders: () => Promise<void>;
  loadActiveDelivery: () => Promise<void>;
  handleAcceptOrder: (orderId: string) => Promise<void>;
  advanceDeliveryStep: (proof?: { deliveryPhoto?: string; deliveryCode?: string }) => Promise<void>;

  todayEarnings: number;
  todayDeliveries: number;
  todayRating: number;
  onlineSinceMinutes: number;
}

export const useRiderSessionStore = create<RiderSessionState>((set, get) => ({
  isOnline: false,
  isTogglingOnline: false,
  toggleOnlineError: null,

  toggleOnline: async () => {
    set({ isTogglingOnline: true, toggleOnlineError: null });
    const nextValue = !get().isOnline;
    try {
      const rider = await setOnlineStatus(nextValue);
      set({ isOnline: rider.isOnline });
      useAuthStore.getState().setProfile(rider);
      if (nextValue) {
        get().loadAvailableOrders();
      }
    } catch (err) {
      set({ toggleOnlineError: err instanceof Error ? err.message : "Impossible de changer de statut." });
    } finally {
      set({ isTogglingOnline: false });
    }
  },

  activeDelivery: null,
  availableOrders: [],
  availableOrdersStatus: "idle",

  loadAvailableOrders: async () => {
    set({ availableOrdersStatus: "loading" });
    try {
      const orders = await fetchAvailableOrders();
      set({ availableOrders: orders, availableOrdersStatus: "loaded" });
    } catch {
      set({ availableOrdersStatus: "error" });
    }
  },

  loadActiveDelivery: async () => {
    try {
      // Une commande "en cours" pour ce rider = assignée mais pas encore livrée.
      const orders = await fetchMyDeliveries([
        OrderStatus.RIDER_ASSIGNED,
        OrderStatus.PICKED_UP,
        OrderStatus.IN_DELIVERY,
      ]);
      set({ activeDelivery: orders[0] ?? null });
    } catch {
      // Échec silencieux — l'écran retentera au prochain chargement manuel.
    }
  },

  handleAcceptOrder: async (orderId) => {
    const order = await acceptOrder(orderId);
    set((state) => ({
      activeDelivery: order,
      availableOrders: state.availableOrders.filter((o) => o.id !== orderId),
    }));
  },

  advanceDeliveryStep: async (proof) => {
    const current = get().activeDelivery;
    if (!current) return;

    const currentIndex = DELIVERY_FLOW.indexOf(current.status);
    const nextStatus = DELIVERY_FLOW[currentIndex + 1];
    if (!nextStatus) return;

    const updated = await updateOrderStatus(current.id, nextStatus, proof);

    if (nextStatus === OrderStatus.DELIVERED) {
      set((state) => ({
        activeDelivery: null,
        todayEarnings: state.todayEarnings + Number(updated.riderEarnings ?? 0),
        todayDeliveries: state.todayDeliveries + 1,
      }));
    } else {
      set({ activeDelivery: updated });
    }
  },

  // TODO: pas encore de route API dédiée aux stats du jour (gains/livraisons
  // cumulés, note moyenne) — à remplacer par GET /api/riders/me/stats une
  // fois cette route créée côté backend. En attendant, ces valeurs partent
  // de zéro à chaque session plutôt que d'afficher des données inventées.
  todayEarnings: 0,
  todayDeliveries: 0,
  todayRating: 0,
  onlineSinceMinutes: 0,
}));
