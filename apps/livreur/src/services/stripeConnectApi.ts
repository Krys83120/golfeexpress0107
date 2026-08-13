import { apiFetch } from "@/services/apiClient";

export interface StripeConnectStatus {
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardingComplete: boolean;
}

/** GET /api/riders/me/stripe/status */
export async function fetchStripeConnectStatus(): Promise<StripeConnectStatus> {
  return apiFetch<StripeConnectStatus>("/api/riders/me/stripe/status");
}

/** POST /api/riders/me/stripe/onboarding-link */
export async function createStripeOnboardingLink(): Promise<string> {
  const data = await apiFetch<{ url: string }>("/api/riders/me/stripe/onboarding-link", { method: "POST" });
  return data.url;
}
