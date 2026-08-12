import { apiFetch } from "@/services/apiClient";
import type { Pro, Rider, User } from "@golfeexpress/types";

export interface PendingPro extends Omit<Pro, "user"> {
  user: Pick<User, "firstName" | "lastName" | "email" | "phone">;
}

export interface PendingRider extends Omit<Rider, "user"> {
  user: Pick<User, "firstName" | "lastName" | "email" | "phone">;
}

/** GET /api/admin/pending-validations */
export async function fetchPendingValidations(): Promise<{ pendingPros: PendingPro[]; pendingRiders: PendingRider[] }> {
  return apiFetch("/api/admin/pending-validations");
}

/** POST /api/admin/pros/[proId]/validate */
export async function validatePro(proId: string, approve: boolean, reason?: string): Promise<Pro> {
  const data = await apiFetch<{ pro: Pro }>(`/api/admin/pros/${proId}/validate`, {
    method: "POST",
    body: { approve, reason },
  });
  return data.pro;
}

/** POST /api/admin/riders/[riderId]/validate */
export async function validateRider(riderId: string, approve: boolean, reason?: string): Promise<Rider> {
  const data = await apiFetch<{ rider: Rider }>(`/api/admin/riders/${riderId}/validate`, {
    method: "POST",
    body: { approve, reason },
  });
  return data.rider;
}
