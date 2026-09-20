import { create } from "zustand";
import type { Address } from "@golfeexpress/types";
import { apiFetch, ApiRequestError } from "@/services/apiClient";

interface CreateAddressInput {
  label: string;
  street: string;
  complement?: string | null;
  zipCode: string;
  city: string;
  lat: number;
  lng: number;
  isDefault?: boolean;
}

interface AddressState {
  addresses: Address[];
  activeAddress: Address | null;
  status: "idle" | "loading" | "loaded" | "error";
  error: string | null;

  loadAddresses: () => Promise<void>;
  setActiveAddress: (address: Address) => void;
  addAddress: (input: CreateAddressInput) => Promise<void>;
  removeAddress: (id: string) => Promise<void>;
}

/**
 * Id réservé à l'adresse temporaire choisie par un client en mode invité
 * (sans compte, voir AddressPickerScreen.tsx) -- jamais une vraie adresse
 * enregistrée en base (GET/POST/DELETE /api/addresses restent authentifiés,
 * on n'y touche pas). Sert à la reconnaître ailleurs dans l'app : CartScreen
 * -> handleCheckout doit la convertir en vraie adresse enregistrée (via
 * addAddress) avant de passer commande, /api/orders exigeant un
 * toAddressId qui existe réellement en base.
 */
export const GUEST_ADDRESS_ID = "guest-temp";

export function isGuestAddress(address: Address | null): boolean {
  return address?.id === GUEST_ADDRESS_ID;
}

export const useAddressStore = create<AddressState>((set, get) => ({
  addresses: [],
  activeAddress: null,
  status: "idle",
  error: null,

  loadAddresses: async () => {
    set({ status: "loading", error: null });
    try {
      const data = await apiFetch<{ addresses: Address[] }>("/api/addresses");
      const defaultAddress = data.addresses.find((a) => a.isDefault) ?? data.addresses[0] ?? null;
      set({
        addresses: data.addresses,
        status: "loaded",
        // Ne change l'adresse active que si elle n'a pas déjà été choisie
        // manuellement par l'utilisateur dans cette session.
        activeAddress: get().activeAddress ?? defaultAddress,
      });
    } catch (err) {
      set({
        status: "error",
        error: err instanceof ApiRequestError ? err.message : "Impossible de charger vos adresses.",
      });
    }
  },

  setActiveAddress: (address) => set({ activeAddress: address }),

  addAddress: async (input) => {
    const data = await apiFetch<{ address: Address }>("/api/addresses", { method: "POST", body: input });
    set((state) => ({
      addresses: [...state.addresses, data.address],
      activeAddress: data.address.isDefault ? data.address : state.activeAddress,
    }));
  },

  removeAddress: async (id) => {
    await apiFetch(`/api/addresses/${id}`, { method: "DELETE" });
    set((state) => {
      const addresses = state.addresses.filter((a) => a.id !== id);
      return {
        addresses,
        activeAddress: state.activeAddress?.id === id ? addresses[0] ?? null : state.activeAddress,
      };
    });
  },
}));
