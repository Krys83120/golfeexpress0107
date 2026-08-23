import { create } from "zustand";

export interface CartItem {
  id: string; // id local unique (productId + options hash)
  productId: string;
  name: string;
  emoji: string;
  unitPrice: number;
  quantity: number;
  optionsLabel?: string; // ex: "Medium, Sauce soja sucrée"
  /** Groupe d'options -> nom(s) du/des choix sélectionné(s), envoyé tel quel à l'API. */
  options?: Record<string, string>;
  /** Instruction libre du client pour cette ligne (ex: "bien cuit"), uniquement si le produit l'autorise (Product.allowSpecialInstructions). */
  specialInstructions?: string;
}

interface CartState {
  proId: string | null;
  proName: string | null;
  /** Adresse de retrait du Pro — nécessaire pour fromAddressId à la commande. */
  pickupAddressId: string | null;
  /**
   * Coordonnées de cette même adresse de retrait (22/08/2026) — permettent à
   * CartScreen de recalculer la distance réelle jusqu'à l'adresse de
   * livraison choisie par le client, et donc d'afficher le vrai tarif de
   * livraison (identique à celui que le serveur facturera), au lieu d'un
   * montant fixe qui restait figé même après changement d'adresse.
   */
  pickupLat: number | null;
  pickupLng: number | null;
  items: CartItem[];

  addItem: (
    item: Omit<CartItem, "quantity"> & { quantity?: number },
    proId: string,
    proName: string,
    pickupAddressId: string | null,
    pickupLat?: number | null,
    pickupLng?: number | null
  ) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  removeItem: (itemId: string) => void;
  clear: () => void;

  // Sélecteurs dérivés
  subtotal: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  proId: null,
  proName: null,
  pickupAddressId: null,
  pickupLat: null,
  pickupLng: null,
  items: [],

  addItem: (item, proId, proName, pickupAddressId, pickupLat = null, pickupLng = null) =>
    set((state) => {
      // Si on change de commerçant, on vide le panier (un panier = un seul pro, comme dans la maquette)
      const sameProCart = state.proId === null || state.proId === proId;
      const baseItems = sameProCart ? state.items : [];

      const existing = baseItems.find((i) => i.id === item.id);
      const nextItems = existing
        ? baseItems.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + (item.quantity ?? 1) } : i
          )
        : [...baseItems, { ...item, quantity: item.quantity ?? 1 }];

      return {
        proId,
        proName,
        pickupAddressId,
        pickupLat,
        pickupLng,
        items: nextItems,
      };
    }),

  updateQuantity: (itemId, delta) =>
    set((state) => ({
      items: state.items
        .map((i) => (i.id === itemId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i))
        .filter((i) => i.quantity > 0),
    })),

  removeItem: (itemId) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== itemId),
    })),

  clear: () => set({ proId: null, proName: null, pickupAddressId: null, pickupLat: null, pickupLng: null, items: [] }),

  subtotal: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
