import { apiFetch } from "@/services/apiClient";

/**
 * DELETE /api/auth/me — suppression de compte en libre-service (voir
 * apps/api/src/app/api/auth/me/route.ts pour le détail : anonymisation,
 * blocage si commande en cours).
 */
export async function deleteMyAccount(): Promise<void> {
  await apiFetch<void>("/api/auth/me", { method: "DELETE" });
}
