import { apiFetch } from "@/services/apiClient";
import type { ContactMessage, OrderReportStatus } from "@golfeexpress/types";

/** GET /api/admin/contact-messages — statusFilter optionnel, ex: ["OPEN", "IN_PROGRESS"]. */
export async function fetchAdminContactMessages(
  statusFilter?: OrderReportStatus[]
): Promise<{ messages: ContactMessage[]; openCount: number }> {
  const query = statusFilter && statusFilter.length > 0 ? `?status=${statusFilter.join(",")}` : "";
  return apiFetch<{ messages: ContactMessage[]; openCount: number }>(`/api/admin/contact-messages${query}`);
}

/** PATCH /api/admin/contact-messages/[messageId] — met à jour le statut et/ou répond au message. */
export async function updateAdminContactMessage(
  messageId: string,
  data: { status?: OrderReportStatus; adminReply?: string }
): Promise<ContactMessage> {
  const result = await apiFetch<{ message: ContactMessage }>(`/api/admin/contact-messages/${messageId}`, {
    method: "PATCH",
    body: data,
  });
  return result.message;
}
