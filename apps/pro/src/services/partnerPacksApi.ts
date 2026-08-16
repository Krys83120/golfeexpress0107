import { apiFetch } from "@/services/apiClient";
import type { PartnerPack, SubscriptionInvoice, SubscriptionType } from "@golfeexpress/types";

export interface MySubscription {
  tier: SubscriptionType;
  expiry: string | null;
  status: string | null;
  /** ISO — début de la période payée en cours ("abonné depuis le..."). */
  currentPeriodStart: string | null;
  /** true si une résiliation est programmée pour la fin de la période en cours. */
  cancelAtPeriodEnd: boolean;
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

/**
 * POST /api/pros/me/subscription/cancel — programme la résiliation en fin
 * de période payée en cours (jamais de coupure immédiate).
 */
export async function cancelSubscription(): Promise<{ cancelAtPeriodEnd: boolean; effectiveDate: string }> {
  return apiFetch<{ cancelAtPeriodEnd: boolean; effectiveDate: string }>("/api/pros/me/subscription/cancel", {
    method: "POST",
  });
}

/** POST /api/pros/me/subscription/reactivate — annule une résiliation programmée. */
export async function reactivateSubscription(): Promise<{ cancelAtPeriodEnd: boolean; nextRenewalDate: string }> {
  return apiFetch<{ cancelAtPeriodEnd: boolean; nextRenewalDate: string }>("/api/pros/me/subscription/reactivate", {
    method: "POST",
  });
}

/** GET /api/pros/me/subscription/invoices */
export async function fetchSubscriptionInvoices(): Promise<SubscriptionInvoice[]> {
  const data = await apiFetch<{ invoices: SubscriptionInvoice[] }>("/api/pros/me/subscription/invoices");
  return data.invoices;
}
