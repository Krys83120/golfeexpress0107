import { create } from "zustand";
import { OrderStatus, ParcelOrderStatus, type Order, type ParcelOrder } from "@golfeexpress/types";
import { acceptOrder, updateOrderStatus, setOnlineStatus, fetchAvailableOrders, fetchMyDeliveries } from "@/services/ridersApi";
import {
  fetchAvailableParcelOrders,
  fetchMyParcelDeliveries,
  acceptParcelOrder,
  updateParcelOrderStatus,
} from "@/services/parcelOrdersApi";
import { useAuthStore } from "@/store/useAuthStore";

// Ordre de progression pour une livraison en cours, utilisé pour déterminer
// la prochaine action proposée au livreur (bouton "J'ai récupéré...", etc.)
const DELIVERY_FLOW: OrderStatus[] = [
  OrderStatus.RIDER_ASSIGNED,
  OrderStatus.PICKED_UP,
  OrderStatus.IN_DELIVERY,
  OrderStatus.DELIVERED,
];

// Même principe pour Colis Express (23/09/2026, finition du workflow
// Livreur) -- table séparée (ParcelOrder), donc flow et actions dédiés,
// jamais mélangés avec ceux des commandes classiques ci-dessus.
const PARCEL_DELIVERY_FLOW: ParcelOrderStatus[] = [
  ParcelOrderStatus.RIDER_ASSIGNED,
  ParcelOrderStatus.PICKED_UP,
  ParcelOrderStatus.IN_DELIVERY,
  ParcelOrderStatus.DELIVERED,
];

interface RiderSessionState {
  isOnline: boolean;
  isTogglingOnline: boolean;
  toggleOnlineError: string | null;
  toggleOnline: () => Promise<void>;

  activeDelivery: Order | null;
  availableOrders: Order[];
  availableOrdersStatus: "idle" | "loading" | "loaded" | "error";

  // Colis Express (23/09/2026) -- mêmes noms/formes que ci-dessus, en
  // parallèle : un livreur peut avoir une livraison classique OU une
  // demande Colis Express en cours (jamais les deux à la fois côté UI, voir
  // HomeScreen.tsx), mais les deux listes "disponibles" sont chargées et
  // affichées indépendamment.
  activeParcelDelivery: ParcelOrder | null;
  availableParcelOrders: ParcelOrder[];
  availableParcelOrdersStatus: "idle" | "loading" | "loaded" | "error";

  // Message affiché (via Alert, voir HomeScreen.tsx) quand une livraison en
  // cours disparaît suite à un rafraîchissement (loadActiveDelivery) plutôt
  // qu'une action du livreur lui-même (advanceDeliveryStep) -- typiquement
  // une annulation forcée par un Admin (voir force-cancel côté API) pendant
  // que le livreur est déjà en route. Sans ça, le livreur restait bloqué
  // sur un écran "livraison en cours" qui ne correspond plus à rien.
  cancelledDeliveryNotice: string | null;
  dismissCancelledDeliveryNotice: () => void;

  loadAvailableOrders: () => Promise<void>;
  loadActiveDelivery: () => Promise<void>;
  handleAcceptOrder: (orderId: string) => Promise<void>;
  advanceDeliveryStep: (proof?: { deliveryPhoto?: string; deliveryCode?: string }) => Promise<void>;

  loadAvailableParcelOrders: () => Promise<void>;
  loadActiveParcelDelivery: () => Promise<void>;
  handleAcceptParcelOrder: (parcelOrderId: string) => Promise<void>;
  advanceParcelDeliveryStep: () => Promise<void>;

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
        get().loadAvailableParcelOrders();
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
  activeParcelDelivery: null,
  availableParcelOrders: [],
  availableParcelOrdersStatus: "idle",
  cancelledDeliveryNotice: null,

  dismissCancelledDeliveryNotice: () => set({ cancelledDeliveryNotice: null }),

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
      const next = orders[0] ?? null;
      set((state) => {
        // `state.activeDelivery` n'est déjà plus renseigné ici quand la
        // livraison s'est terminée normalement (advanceDeliveryStep la vide
        // directement dès le passage DELIVERED, avant même ce prochain
        // appel) -- donc si on avait encore une livraison active en mémoire
        // et qu'elle a disparu (ou a été remplacée) suite à CE
        // rafraîchissement, c'est forcément une disparition externe
        // (annulation forcée par un Admin).
        const previous = state.activeDelivery;
        const disappearedExternally = Boolean(previous) && previous!.id !== next?.id;
        return {
          activeDelivery: next,
          cancelledDeliveryNotice: disappearedExternally
            ? `La commande ${previous!.orderNumber} a été annulée par notre équipe.`
            : state.cancelledDeliveryNotice,
        };
      });
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

  // Colis Express (23/09/2026) -- mêmes principes exacts que les 4 méthodes
  // ci-dessus, adaptés à ParcelOrder (pas de preuve de remise/photo/code,
  // voir CurrentParcelDeliveryCard.tsx pour le détail de cette différence).
  loadAvailableParcelOrders: async () => {
    set({ availableParcelOrdersStatus: "loading" });
    try {
      const parcelOrders = await fetchAvailableParcelOrders();
      set({ availableParcelOrders: parcelOrders, availableParcelOrdersStatus: "loaded" });
    } catch {
      set({ availableParcelOrdersStatus: "error" });
    }
  },

  loadActiveParcelDelivery: async () => {
    try {
      const parcelOrders = await fetchMyParcelDeliveries([
        ParcelOrderStatus.RIDER_ASSIGNED,
        ParcelOrderStatus.PICKED_UP,
        ParcelOrderStatus.IN_DELIVERY,
      ]);
      set({ activeParcelDelivery: parcelOrders[0] ?? null });
    } catch {
      // Échec silencieux — même choix que loadActiveDelivery ci-dessus.
    }
  },

  handleAcceptParcelOrder: async (parcelOrderId) => {
    const parcelOrder = await acceptParcelOrder(parcelOrderId);
    set((state) => ({
      activeParcelDelivery: parcelOrder,
      availableParcelOrders: state.availableParcelOrders.filter((p) => p.id !== parcelOrderId),
    }));
  },

  advanceParcelDeliveryStep: async () => {
    const current = get().activeParcelDelivery;
    if (!current) return;

    const currentIndex = PARCEL_DELIVERY_FLOW.indexOf(current.status);
    const nextStatus = PARCEL_DELIVERY_FLOW[currentIndex + 1];
    if (!nextStatus) return;

    const updated = await updateParcelOrderStatus(current.id, nextStatus);

    if (nextStatus === ParcelOrderStatus.DELIVERED) {
      set((state) => ({
        activeParcelDelivery: null,
        todayEarnings: state.todayEarnings + Number(updated.riderEarnings ?? 0),
        todayDeliveries: state.todayDeliveries + 1,
      }));
    } else {
      set({ activeParcelDelivery: updated });
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
