import { apiFetch } from "@/services/apiClient";
import type { OrderReport, OrderReportCategory } from "@golfeexpress/types";

interface CreateReportInput {
  orderId: string;
  category: OrderReportCategory;
  message: string;
  photoUrl?: string;
}

/** POST /api/reports — dépose une réclamation sur une commande. */
export async function createReport(input: CreateReportInput): Promise<OrderReport> {
  const data = await apiFetch<{ report: OrderReport }>("/api/reports", {
    method: "POST",
    body: input,
  });
  return data.report;
}

/** GET /api/reports — historique des réclamations du client connecté. */
export async function fetchMyReports(): Promise<OrderReport[]> {
  const data = await apiFetch<{ reports: OrderReport[] }>("/api/reports");
  return data.reports;
}
