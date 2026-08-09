import { apiFetch } from "@/services/apiClient";
import type { Order, OrderStatus } from "@golfeexpress/types";

/** GET /api/orders — commandes reçues par la boutique du Pro connecté. */
export async function fetchMyShopOrders(statusFilter?: OrderStatus[]): Promise<Order[]> {
  const query = statusFilter && statusFilter.length > 0 ? `?status=${statusFilter.join(",")}` : "";
  const data = await apiFetch<{ orders: Order[] }>(`/api/orders${query}`);
  return data.orders;
}

/** PATCH /api/orders/[orderId]/status */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  options?: { note?: string; estimatedPrepMinutes?: number }
): Promise<Order> {
  const data = await apiFetch<{ order: Order }>(`/api/orders/${orderId}/status`, {
    method: "PATCH",
    body: { status, note: options?.note, estimatedPrepMinutes: options?.estimatedPrepMinutes },
  });
  return data.order;
}

/** PATCH /api/orders/[orderId]/mark-ready — pour le cas où un livreur est déjà assigné (recherche anticipée). */
export async function markOrderReady(orderId: string): Promise<Order> {
  const data = await apiFetch<{ order: Order }>(`/api/orders/${orderId}/mark-ready`, { method: "PATCH" });
  return data.order;
}
