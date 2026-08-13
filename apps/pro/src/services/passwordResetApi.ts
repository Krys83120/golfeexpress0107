import { apiFetch } from "@/services/apiClient";

/** POST /api/auth/forgot-password */
export async function requestPasswordReset(email: string): Promise<void> {
  await apiFetch("/api/auth/forgot-password", { method: "POST", body: { email }, skipAuth: true });
}

/** POST /api/auth/reset-password */
export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  await apiFetch("/api/auth/reset-password", { method: "POST", body: { token, newPassword }, skipAuth: true });
}
