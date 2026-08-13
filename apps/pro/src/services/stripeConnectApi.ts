import { apiFetch } from "@/services/apiClient";

export interface StripeConnectStatus {
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardingComplete: boolean;
}

/** GET /api/pros/me/stripe/status */
export async function fetchStripeConnectStatus(): Promise<StripeConnectStatus> {
  return apiFetch<StripeConnectStatus>("/api/pros/me/stripe/status");
}

/** POST /api/pros/me/stripe/onboarding-link */
export async function createStripeOnboardingLink(): Promise<string> {
  const data = await apiFetch<{ url: string }>("/api/pros/me/stripe/onboarding-link", { method: "POST" });
  return data.url;
}
