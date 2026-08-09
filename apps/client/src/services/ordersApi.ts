import { apiFetch } from "@/services/apiClient";
import type { Order } from "@golfeexpress/types";
import type { CartItem } from "@/store/useCartStore";

interface CreateOrderInput {
  proId: string;
  fromAddressId: string;
  toAddressId: string;
  items: CartItem[];
  clientNote?: string;
}

/** POST /api/orders — crée la commande, montants calculés côté serveur. */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const data = await apiFetch<{ order: Order }>("/api/orders", {
    method: "POST",
    body: {
      proId: input.proId,
      fromAddressId: input.fromAddressId,
      toAddressId: input.toAddressId,
      clientNote: input.clientNote,
      items: input.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        options: item.options,
      })),
    },
  });
  return data.order;
}

/** POST /api/orders/[orderId]/payment-intent — renvoie le client_secret Stripe. */
export async function createPaymentIntent(orderId: string): Promise<string> {
  const data = await apiFetch<{ clientSecret: string }>(`/api/orders/${orderId}/payment-intent`, {
    method: "POST",
  });
  return data.clientSecret;
}

/** GET /api/orders — historique des commandes du client connecté. */
export async function fetchMyOrders(statusFilter?: string[]): Promise<Order[]> {
  const query = statusFilter && statusFilter.length > 0 ? `?status=${statusFilter.join(",")}` : "";
  const data = await apiFetch<{ orders: Order[] }>(`/api/orders${query}`);
  return data.orders;
}
