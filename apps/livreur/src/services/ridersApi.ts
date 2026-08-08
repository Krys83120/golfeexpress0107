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

export interface EarningEntry {
  id: string;
  orderNumber: string;
  type: "DELIVERY_FEE" | "TIP" | "BONUS" | "INCENTIVE";
  amount: number;
  status: "PENDING" | "AVAILABLE" | "PAID";
  createdAt: string;
}

export interface EarningsSummary {
  availableBalance: number;
  pendingBalance: number;
  weekTotal: number;
  monthTotal: number;
}

/** GET /api/riders/me/earnings */
export async function fetchMyEarnings(): Promise<{ earnings: EarningEntry[]; summary: EarningsSummary }> {
  return apiFetch<{ earnings: EarningEntry[]; summary: EarningsSummary }>("/api/riders/me/earnings");
}

export interface WithdrawalEntry {
  id: string;
  amount: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  createdAt: string;
  processedAt: string | null;
}

/** GET /api/riders/me/withdrawals */
export async function fetchMyWithdrawals(): Promise<WithdrawalEntry[]> {
  const data = await apiFetch<{ withdrawals: WithdrawalEntry[] }>("/api/riders/me/withdrawals");
  return data.withdrawals;
}

/** POST /api/riders/me/withdrawals */
export async function requestWithdrawal(amount: number): Promise<WithdrawalEntry> {
  const data = await apiFetch<{ withdrawal: WithdrawalEntry }>("/api/riders/me/withdrawals", {
    method: "POST",
    body: { amount },
  });
  return data.withdrawal;
}

export interface RiderStats {
  totalDeliveries: number;
  rating: number | null;
  ratingCount: number;
  avgDeliveryMinutes: number | null;
  memberSinceLabel: string;
  weeklyDeliveries: { label: string; deliveries: number }[];
}

/** GET /api/riders/me/stats */
export async function fetchMyStats(): Promise<RiderStats> {
  return apiFetch<RiderStats>("/api/riders/me/stats");
}
