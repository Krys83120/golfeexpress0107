import { apiFetch } from "@/services/apiClient";
import type { Rider, RiderProfessionalStatus, VehicleType } from "@golfeexpress/types";

/** GET /api/riders/me */
export async function fetchMyRiderProfile(): Promise<Rider> {
  const data = await apiFetch<{ rider: Rider }>("/api/riders/me");
  return data.rider;
}

export interface UpdateRiderProfileInput {
  vehicleType?: VehicleType;
  vehiclePlate?: string | null;
  licenseNumber?: string | null;
  idCardFront?: string;
  idCardBack?: string;
  iban?: string;
  birthDate?: string | null;
  street?: string | null;
  zipCode?: string | null;
  city?: string | null;
  profilePhotoUrl?: string | null;
  verificationSelfieUrl?: string | null;
  professionalStatus?: RiderProfessionalStatus | null;
  siret?: string | null;
  insuranceProvider?: string | null;
  insurancePolicyNumber?: string | null;
  autoOfflineTimeoutMinutes?: number;
  notificationsEnabled?: boolean;
  acceptTerms?: boolean;
  termsVersion?: string;
}

/** PATCH /api/riders/me */
export async function updateMyRiderProfile(updates: UpdateRiderProfileInput): Promise<Rider> {
  const data = await apiFetch<{ rider: Rider }>("/api/riders/me", { method: "PATCH", body: updates });
  return data.rider;
}

export interface RiderKycDocumentUrls {
  idCardFront: string | null;
  idCardBack: string | null;
  verificationSelfieUrl: string | null;
}

/**
 * GET /api/riders/me/kyc-documents -- URLs signées temporaires (5 min) pour
 * revoir ses propres documents déjà envoyés (voir RiderKycScreen.tsx).
 * Correctif du 02/10/2026 : Rider.idCardFront/idCardBack/verificationSelfieUrl
 * ne sont plus des URLs directement affichables (bucket Supabase privé) --
 * voir apps/api/src/lib/kycDocuments.ts pour le détail.
 */
export async function fetchMyKycDocumentUrls(): Promise<RiderKycDocumentUrls> {
  return apiFetch("/api/riders/me/kyc-documents");
}
