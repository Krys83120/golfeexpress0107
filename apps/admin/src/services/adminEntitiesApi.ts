import { apiFetch } from "@/services/apiClient";
import type { User, Pro, Rider, Address, Product } from "@golfeexpress/types";

/** GET /api/admin/pros/:proId/products */
export async function fetchAdminProProducts(proId: string): Promise<Product[]> {
  const data = await apiFetch<{ products: Product[] }>(`/api/admin/pros/${proId}/products`);
  return data.products;
}

/** PATCH /api/admin/pros/:proId/products/:productId */
export async function toggleAdminProduct(proId: string, productId: string, isAvailable: boolean): Promise<Product> {
  const data = await apiFetch<{ product: Product }>(`/api/admin/pros/${proId}/products/${productId}`, {
    method: "PATCH",
    body: { isAvailable },
  });
  return data.product;
}

/** PATCH /api/admin/pros/:proId/products/rename-category — modération : renomme/fusionne une catégorie. */
export async function renameAdminProductCategory(proId: string, oldName: string, newName: string): Promise<number> {
  const data = await apiFetch<{ updatedCount: number }>(`/api/admin/pros/${proId}/products/rename-category`, {
    method: "PATCH",
    body: { oldName, newName },
  });
  return data.updatedCount;
}

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

export interface UpdateAdminUserPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: User["role"];
  status?: User["status"];
}

/** PATCH /api/admin/users/:userId */
export async function updateAdminUser(userId: string, payload: UpdateAdminUserPayload): Promise<User> {
  return apiFetch<User>(`/api/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export interface AdminProRow extends Omit<Pro, "addresses" | "user"> {
  user: Pick<User, "firstName" | "lastName" | "email" | "phone">;
  addresses: Address[];
  _count: { orders: number };
}

/** GET /api/admin/pros */
export async function fetchAdminPros(): Promise<AdminProRow[]> {
  const data = await apiFetch<{ pros: AdminProRow[] }>("/api/admin/pros");
  return data.pros;
}

export interface AdminRiderRow extends Omit<Rider, "user"> {
  user: Pick<User, "firstName" | "lastName" | "email" | "phone">;
}

/** GET /api/admin/riders */
export async function fetchAdminRiders(): Promise<AdminRiderRow[]> {
  const data = await apiFetch<{ riders: AdminRiderRow[] }>("/api/admin/riders");
  return data.riders;
}

export interface UpdateAdminRiderPayload {
  vehicleType?: Rider["vehicleType"];
  vehiclePlate?: string | null;
  status?: Rider["status"];
}

/** PATCH /api/admin/riders/:riderId */
export async function updateAdminRider(riderId: string, payload: UpdateAdminRiderPayload): Promise<AdminRiderRow> {
  const data = await apiFetch<{ rider: AdminRiderRow }>(`/api/admin/riders/${riderId}`, {
    method: "PATCH",
    body: payload,
  });
  return data.rider;
}

export interface UpdateAdminProPayload {
  businessName?: string;
  legalName?: string | null;
  legalForm?: string | null;
  vatNumber?: string | null;
  managerFirstName?: string | null;
  managerLastName?: string | null;
  phone?: string;
  emailContact?: string;
  category?: Pro["category"];
  status?: Pro["status"];
}

/** PATCH /api/admin/pros/:proId */
export async function updateAdminPro(proId: string, payload: UpdateAdminProPayload): Promise<AdminProRow> {
  const data = await apiFetch<{ pro: AdminProRow }>(`/api/admin/pros/${proId}`, {
    method: "PATCH",
    body: payload,
  });
  return data.pro;
}
