import { apiFetch } from "@/services/apiClient";
import type { ServiceCity } from "@golfeexpress/types";

/** GET /api/admin/service-cities */
export async function fetchServiceCities(): Promise<ServiceCity[]> {
  const data = await apiFetch<{ cities: ServiceCity[] }>("/api/admin/service-cities");
  return data.cities;
}

/** POST /api/admin/service-cities — créée INACTIVE par défaut (voir route.ts). */
export async function createServiceCity(name: string): Promise<ServiceCity> {
  const data = await apiFetch<{ city: ServiceCity }>("/api/admin/service-cities", {
    method: "POST",
    body: { name },
  });
  return data.city;
}

/** PATCH /api/admin/service-cities/[cityId] */
export async function updateServiceCity(
  cityId: string,
  data: {
    name?: string;
    isActive?: boolean;
    sortOrder?: number;
    // Extension SEO (23/08/2026) — indépendante d'isActive, voir route.ts.
    seoIndexable?: boolean;
    seoSlug?: string;
    seoIntro?: string;
    lat?: number;
    lng?: number;
  }
): Promise<ServiceCity> {
  const result = await apiFetch<{ city: ServiceCity }>(`/api/admin/service-cities/${cityId}`, {
    method: "PATCH",
    body: data,
  });
  return result.city;
}

/** DELETE /api/admin/service-cities/[cityId] */
export async function deleteServiceCity(cityId: string): Promise<void> {
  await apiFetch(`/api/admin/service-cities/${cityId}`, { method: "DELETE" });
}
