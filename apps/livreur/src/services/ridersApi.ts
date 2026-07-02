import { apiFetch } from "@/services/apiClient";
import type { Order, Rider } from "@golfeexpress/types";

/** GET /api/riders/me/available-orders */
export async function fetchAvailableOrders(): Promise<Order[]> {
  const data = await apiFetch<{ orders: Order[] }>("/api/riders/me/available-orders");
  return data.orders;
}

/** POST /api/orders/[orderId]/accept */
export async function acceptOrder(orderId: string): Promise<Order> {
  const data = await apiFetch<{ order: Order }>(`/api/orders/${orderId}/accept`, { method: "POST" });
  return data.order;
}

/** PATCH /api/orders/[orderId]/status */
export async function updateOrderStatus(orderId: string, status: string, note?: string): Promise<Order> {
  const data = await apiFetch<{ order: Order }>(`/api/orders/${orderId}/status`, {
    method: "PATCH",
    body: { status, note },
  });
  return data.order;
}

/** PATCH /api/riders/me/online */
export async function setOnlineStatus(isOnline: boolean): Promise<Rider> {
  const data = await apiFetch<{ rider: Rider }>("/api/riders/me/online", {
    method: "PATCH",
    body: { isOnline },
  });
  return data.rider;
}

/** PATCH /api/riders/me/location */
export async function updateLocation(lat: number, lng: number, orderId?: string): Promise<void> {
  await apiFetch("/api/riders/me/location", {
    method: "PATCH",
    body: { lat, lng, orderId },
  });
}

/** GET /api/orders — commandes assignées au rider connecté (en cours + historique). */
export async function fetchMyDeliveries(statusFilter?: string[]): Promise<Order[]> {
  const query = statusFilter && statusFilter.length > 0 ? `?status=${statusFilter.join(",")}` : "";
  const data = await apiFetch<{ orders: Order[] }>(`/api/orders${query}`);
  return data.orders;
}
