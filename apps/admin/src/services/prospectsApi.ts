import { apiFetch } from "@/services/apiClient";
import type { Prospect } from "@golfeexpress/types";

/** GET /api/admin/prospects */
export async function fetchProspects(): Promise<Prospect[]> {
  const data = await apiFetch<{ prospects: Prospect[] }>("/api/admin/prospects");
  return data.prospects;
}

export interface CreateProspectInput {
  businessName: string;
  city: string;
  category?: string;
  email?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  googleMapsUrl?: string | null;
  notes?: string | null;
}

/** POST /api/admin/prospects */
export async function createProspect(input: CreateProspectInput): Promise<Prospect> {
  const data = await apiFetch<{ prospect: Prospect }>("/api/admin/prospects", { method: "POST", body: input });
  return data.prospect;
}

/** PATCH /api/admin/prospects/[prospectId] */
export async function updateProspect(
  prospectId: string,
  input: Partial<CreateProspectInput>
): Promise<Prospect> {
  const data = await apiFetch<{ prospect: Prospect }>(`/api/admin/prospects/${prospectId}`, {
    method: "PATCH",
    body: input,
  });
  return data.prospect;
}

/** DELETE /api/admin/prospects/[prospectId] */
export async function deleteProspect(prospectId: string): Promise<void> {
  await apiFetch(`/api/admin/prospects/${prospectId}`, { method: "DELETE" });
}

export type ProspectingEmailMode = "preview" | "test" | "send";

/** POST /api/admin/prospects/[prospectId]/send-email */
export async function sendProspectingEmailAction(
  prospectId: string,
  body: { subject: string; introText: string; mode: ProspectingEmailMode }
): Promise<{ html?: string; sent?: boolean; to?: string; sentAt?: string }> {
  return apiFetch(`/api/admin/prospects/${prospectId}/send-email`, { method: "POST", body });
}

/** POST /api/admin/prospects/seed -- importe la liste de départ (recherche web), voir prospectSeedData.ts côté API. */
export async function seedProspects(): Promise<{ imported: number; skipped: number }> {
  return apiFetch("/api/admin/prospects/seed", { method: "POST" });
}

/** POST /api/admin/prospects/annotate -- applique vente à emporter / présence Uber Eats, voir prospectAnnotations.ts côté API. */
export async function annotateProspects(): Promise<{ updated: number; deleted: number; notFound: number }> {
  return apiFetch("/api/admin/prospects/annotate", { method: "POST" });
}

export interface ImportProspectRow {
  businessName: string;
  city: string;
  category?: string;
  email?: string;
  phone?: string;
  websiteUrl?: string;
  googleMapsUrl?: string;
  notes?: string;
}

/** POST /api/admin/prospects/import -- import CSV (parsing déjà fait côté client). */
export async function importProspectsRows(
  rows: ImportProspectRow[]
): Promise<{ imported: number; skipped: number; errors: { row: number; message: string }[] }> {
  return apiFetch("/api/admin/prospects/import", { method: "POST", body: { rows } });
}
