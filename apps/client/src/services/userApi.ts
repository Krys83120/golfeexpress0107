import { apiFetch } from "@/services/apiClient";
import type { User } from "@golfeexpress/types";

/** PATCH /api/auth/me */
export async function updateMyUserProfile(updates: { avatar?: string | null }): Promise<User> {
  const data = await apiFetch<{ user: User }>("/api/auth/me", { method: "PATCH", body: updates });
  return data.user;
}
