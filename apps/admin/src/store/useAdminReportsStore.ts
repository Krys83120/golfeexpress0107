import { create } from "zustand";
import type { OrderReport, OrderReportStatus } from "@golfeexpress/types";
import { fetchAdminReports, updateAdminReport } from "@/services/adminReportsApi";

interface AdminReportsState {
  reports: OrderReport[];
  /** Nombre de réclamations OPEN + IN_PROGRESS -- alimente le badge Sidebar. */
  openCount: number;
  status: "idle" | "loading" | "loaded" | "error";
  error: string | null;

  loadReports: (statusFilter?: OrderReportStatus[]) => Promise<void>;
  reply: (reportId: string, adminReply: string, newStatus?: OrderReportStatus) => Promise<void>;
  setStatus: (reportId: string, newStatus: OrderReportStatus) => Promise<void>;
}

function isOpenStatus(status: OrderReportStatus): boolean {
  return status === "OPEN" || status === "IN_PROGRESS";
}

export const useAdminReportsStore = create<AdminReportsState>((set, get) => ({
  reports: [],
  openCount: 0,
  status: "idle",
  error: null,

  loadReports: async (statusFilter) => {
    set({ status: "loading", error: null });
    try {
      const { reports, openCount } = await fetchAdminReports(statusFilter);
      set({ reports, openCount, status: "loaded" });
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : "Impossible de charger les réclamations." });
    }
  },

  reply: async (reportId, adminReply, newStatus) => {
    const previous = get().reports.find((r) => r.id === reportId);
    const wasOpen = previous ? isOpenStatus(previous.status) : false;
    const updated = await updateAdminReport(reportId, {
      adminReply,
      status: newStatus ?? ("RESOLVED" as OrderReportStatus),
    });
    const isOpen = isOpenStatus(updated.status);
    set((state) => ({
      reports: state.reports.map((r) => (r.id === reportId ? updated : r)),
      openCount: state.openCount + (isOpen && !wasOpen ? 1 : !isOpen && wasOpen ? -1 : 0),
    }));
  },

  setStatus: async (reportId, newStatus) => {
    const previous = get().reports.find((r) => r.id === reportId);
    const wasOpen = previous ? isOpenStatus(previous.status) : false;
    const updated = await updateAdminReport(reportId, { status: newStatus });
    const isOpen = isOpenStatus(updated.status);
    set((state) => ({
      reports: state.reports.map((r) => (r.id === reportId ? updated : r)),
      openCount: state.openCount + (isOpen && !wasOpen ? 1 : !isOpen && wasOpen ? -1 : 0),
    }));
  },
}));
