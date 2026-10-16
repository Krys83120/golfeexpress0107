import { apiFetch } from "@/services/apiClient";

export type StudyAudience = "MERCHANTS" | "CLIENTS" | "RIDERS";

export interface StudyAction {
  id: string;
  text: string;
  done: boolean;
}

export interface MarketStudy {
  id: string;
  audience: StudyAudience;
  title: string;
  question: string | null;
  summary: string | null;
  findings: string | null;
  actions: StudyAction[];
  simulationId: string | null;
  reportId: string | null;
  rounds: number | null;
  agents: number | null;
  limitsNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudyInput {
  audience: StudyAudience;
  title: string;
  question?: string | null;
  summary?: string | null;
  findings?: string | null;
  actions?: StudyAction[];
  simulationId?: string | null;
  reportId?: string | null;
  rounds?: number | null;
  agents?: number | null;
  limitsNote?: string | null;
}

/** GET /api/admin/studies */
export async function fetchStudies(): Promise<MarketStudy[]> {
  const data = await apiFetch<{ studies: MarketStudy[] }>("/api/admin/studies");
  return data.studies;
}

/** POST /api/admin/studies */
export async function createStudy(input: StudyInput): Promise<MarketStudy> {
  const data = await apiFetch<{ study: MarketStudy }>("/api/admin/studies", { method: "POST", body: input });
  return data.study;
}

/** PATCH /api/admin/studies -- l'id part dans le body. */
export async function updateStudy(id: string, input: Partial<StudyInput>): Promise<MarketStudy> {
  const data = await apiFetch<{ study: MarketStudy }>("/api/admin/studies", {
    method: "PATCH",
    body: { id, ...input },
  });
  return data.study;
}

/** DELETE /api/admin/studies?id=... */
export async function deleteStudy(id: string): Promise<void> {
  await apiFetch(`/api/admin/studies?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}
