import { apiFetch } from "@/services/apiClient";
import type { AdminPartnerPack, SubscriptionType } from "@golfeexpress/types";

export interface UpdatePartnerPackInput {
  tier: SubscriptionType;
  name?: string;
  priceMonthly?: number;
  commissionRate?: number;
  features?: string[];
  isActive?: boolean;
}

/** GET /api/admin/partner-packs */
export async function fetchAdminPacks(): Promise<AdminPartnerPack[]> {
  const data = await apiFetch<{ packs: AdminPartnerPack[] }>("/api/admin/partner-packs");
  return data.packs;
}

/** PATCH /api/admin/partner-packs — met à jour UN pack (voir tier dans le body). */
export async function updatePartnerPack(input: UpdatePartnerPackInput): Promise<AdminPartnerPack[]> {
  const data = await apiFetch<{ pack: AdminPartnerPack; packs: AdminPartnerPack[] }>("/api/admin/partner-packs", {
    method: "PATCH",
    body: input,
  });
  return data.packs;
}
