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
  acceptTerms?: boolean;
  termsVersion?: string;
}

/** PATCH /api/riders/me */
export async function updateMyRiderProfile(updates: UpdateRiderProfileInput): Promise<Rider> {
  const data = await apiFetch<{ rider: Rider }>("/api/riders/me", { method: "PATCH", body: updates });
  return data.rider;
}
