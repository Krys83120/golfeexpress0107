import { apiFetch } from "@/services/apiClient";
import type { Pro, OpeningHours } from "@golfeexpress/types";

interface UpdateProProfileInput {
  businessName?: string;
  description?: string | null;
  phone?: string;
  emailContact?: string;
  logo?: string | null;
  coverImage?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  tiktokUrl?: string | null;
  websiteUrl?: string | null;
  googlePlaceId?: string | null;
}

/** GET /api/pros/me */
export async function fetchMyShopProfile(): Promise<Pro> {
  const data = await apiFetch<{ pro: Pro }>("/api/pros/me");
  return data.pro;
}

/** PATCH /api/pros/me */
export async function updateMyShopProfile(updates: UpdateProProfileInput): Promise<Pro> {
  const data = await apiFetch<{ pro: Pro }>("/api/pros/me", { method: "PATCH", body: updates });
  return data.pro;
}

interface GoogleRatingSyncResult {
  googleRating: number | null;
  googleRatingCount: number | null;
  googleRatingSyncedAt: string | null;
}

/** POST /api/pros/me/google-rating/sync */
export async function syncGoogleRating(): Promise<GoogleRatingSyncResult> {
  return apiFetch<GoogleRatingSyncResult>("/api/pros/me/google-rating/sync", { method: "POST" });
}

interface OpeningHourInput {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

/** GET /api/pros/me/opening-hours */
export async function fetchMyOpeningHours(): Promise<OpeningHours[]> {
  const data = await apiFetch<{ openingHours: OpeningHours[] }>("/api/pros/me/opening-hours");
  return data.openingHours;
}

/** PUT /api/pros/me/opening-hours */
export async function updateMyOpeningHours(hours: OpeningHourInput[]): Promise<OpeningHours[]> {
  const data = await apiFetch<{ openingHours: OpeningHours[] }>("/api/pros/me/opening-hours", {
    method: "PUT",
    body: { hours },
  });
  return data.openingHours;
}
