import { apiFetch } from "@/services/apiClient";
import type { PartnerPack, SubscriptionType } from "@golfeexpress/types";

export interface MySubscription {
  tier: SubscriptionType;
  expiry: string | null;
  status: string | null;
  commissionRate: number;
  hasBillingAccount: boolean;
  hasActiveSubscription: boolean;
}

/** GET /api/pros/me/subscription */
export async function fetchMySubscription(): Promise<{ subscription: MySubscription; packs: PartnerPack[] }> {
  return apiFetch<{ subscription: MySubscription; packs: PartnerPack[] }>("/api/pros/me/subscription");
}

/** POST /api/pros/me/subscription/checkout — renvoie l'URL Stripe Checkout à ouvrir. */
export async function startPackCheckout(tier: SubscriptionType): Promise<string> {
  const data = await apiFetch<{ url: string }>("/api/pros/me/subscription/checkout", {
    method: "POST",
    body: { tier },
  });
  return data.url;
}

/** POST /api/pros/me/subscription/portal — renvoie l'URL du Billing Portal Stripe à ouvrir. */
export async function openBillingPortal(): Promise<string> {
  const data = await apiFetch<{ url: string }>("/api/pros/me/subscription/portal", { method: "POST" });
  return data.url;
}
