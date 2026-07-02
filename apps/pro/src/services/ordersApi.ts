import { apiFetch } from "@/services/apiClient";
import type { Order, OrderStatus } from "@golfeexpress/types";

/** GET /api/orders — commandes reçues par la boutique du Pro connecté. */
export async function fetchMyShopOrders(statusFilter?: OrderStatus[]): Promise<Order[]> {
  const query = statusFilter && statusFilter.length > 0 ? `?status=${statusFilter.join(",")}` : "";
  const data = await apiFetch<{ orders: Order[] }>(`/api/orders${query}`);
  return data.orders;
}

/** PATCH /api/orders/[orderId]/status */
export async function updateOrderStatus(orderId: string, status: OrderStatus, note?: string): Promise<Order> {
  const data = await apiFetch<{ order: Order }>(`/api/orders/${orderId}/status`, {
    method: "PATCH",
    body: { status, note },
  });
  return data.order;
}
