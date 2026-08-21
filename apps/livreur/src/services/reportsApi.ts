import { apiFetch } from "@/services/apiClient";
import type { OrderReport, OrderReportCategory } from "@golfeexpress/types";

interface CreateReportInput {
  orderId: string;
  category: OrderReportCategory;
  message: string;
  photoUrl?: string;
}

/** POST /api/reports — signale un problème sur la livraison en cours. */
export async function createReport(input: CreateReportInput): Promise<OrderReport> {
  const data = await apiFetch<{ report: OrderReport }>("/api/reports", {
    method: "POST",
    body: input,
  });
  return data.report;
}
