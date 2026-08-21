import { apiFetch } from "@/services/apiClient";
import type { OrderReport, OrderReportStatus } from "@golfeexpress/types";

/** GET /api/admin/reports — statusFilter optionnel, ex: ["OPEN", "IN_PROGRESS"]. */
export async function fetchAdminReports(
  statusFilter?: OrderReportStatus[]
): Promise<{ reports: OrderReport[]; openCount: number }> {
  const query = statusFilter && statusFilter.length > 0 ? `?status=${statusFilter.join(",")}` : "";
  return apiFetch<{ reports: OrderReport[]; openCount: number }>(`/api/admin/reports${query}`);
}

/** PATCH /api/admin/reports/[reportId] — met à jour le statut et/ou répond au signalement. */
export async function updateAdminReport(
  reportId: string,
  data: { status?: OrderReportStatus; adminReply?: string }
): Promise<OrderReport> {
  const result = await apiFetch<{ report: OrderReport }>(`/api/admin/reports/${reportId}`, {
    method: "PATCH",
    body: data,
  });
  return result.report;
}
