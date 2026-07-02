import { apiFetch } from "@/services/apiClient";
import type { User, Pro, Rider } from "@golfeexpress/types";

interface FetchUsersParams {
  role?: string;
  search?: string;
}

/** GET /api/admin/users */
export async function fetchAdminUsers(params: FetchUsersParams = {}): Promise<User[]> {
  const query = new URLSearchParams();
  if (params.role) query.set("role", params.role);
  if (params.search) query.set("search", params.search);
  const search = query.toString();
  const data = await apiFetch<{ users: User[] }>(`/api/admin/users${search ? `?${search}` : ""}`);
  return data.users;
}

export interface AdminProRow extends Omit<Pro, "addresses" | "user"> {
  user: Pick<User, "firstName" | "lastName" | "email">;
  addresses: { city: string }[];
  _count: { orders: number };
}

/** GET /api/admin/pros */
export async function fetchAdminPros(): Promise<AdminProRow[]> {
  const data = await apiFetch<{ pros: AdminProRow[] }>("/api/admin/pros");
  return data.pros;
}

export interface AdminRiderRow extends Omit<Rider, "user"> {
  user: Pick<User, "firstName" | "lastName" | "email">;
}

/** GET /api/admin/riders */
export async function fetchAdminRiders(): Promise<AdminRiderRow[]> {
  const data = await apiFetch<{ riders: AdminRiderRow[] }>("/api/admin/riders");
  return data.riders;
}
