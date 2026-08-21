import { create } from "zustand";
import type { ContactMessage, OrderReportStatus } from "@golfeexpress/types";
import { fetchAdminContactMessages, updateAdminContactMessage } from "@/services/adminContactMessagesApi";

interface AdminContactMessagesState {
  messages: ContactMessage[];
  /** Nombre de messages OPEN + IN_PROGRESS -- alimente le badge Sidebar. */
  openCount: number;
  status: "idle" | "loading" | "loaded" | "error";
  error: string | null;

  loadMessages: (statusFilter?: OrderReportStatus[]) => Promise<void>;
  reply: (messageId: string, adminReply: string, newStatus?: OrderReportStatus) => Promise<void>;
  setStatus: (messageId: string, newStatus: OrderReportStatus) => Promise<void>;
}

function isOpenStatus(status: OrderReportStatus): boolean {
  return status === "OPEN" || status === "IN_PROGRESS";
}

export const useAdminContactMessagesStore = create<AdminContactMessagesState>((set, get) => ({
  messages: [],
  openCount: 0,
  status: "idle",
  error: null,

  loadMessages: async (statusFilter) => {
    set({ status: "loading", error: null });
    try {
      const { messages, openCount } = await fetchAdminContactMessages(statusFilter);
      set({ messages, openCount, status: "loaded" });
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : "Impossible de charger les messages." });
    }
  },

  reply: async (messageId, adminReply, newStatus) => {
    const previous = get().messages.find((m) => m.id === messageId);
    const wasOpen = previous ? isOpenStatus(previous.status) : false;
    const updated = await updateAdminContactMessage(messageId, {
      adminReply,
      status: newStatus ?? ("RESOLVED" as OrderReportStatus),
    });
    const isOpen = isOpenStatus(updated.status);
    set((state) => ({
      messages: state.messages.map((m) => (m.id === messageId ? updated : m)),
      openCount: state.openCount + (isOpen && !wasOpen ? 1 : !isOpen && wasOpen ? -1 : 0),
    }));
  },

  setStatus: async (messageId, newStatus) => {
    const previous = get().messages.find((m) => m.id === messageId);
    const wasOpen = previous ? isOpenStatus(previous.status) : false;
    const updated = await updateAdminContactMessage(messageId, { status: newStatus });
    const isOpen = isOpenStatus(updated.status);
    set((state) => ({
      messages: state.messages.map((m) => (m.id === messageId ? updated : m)),
      openCount: state.openCount + (isOpen && !wasOpen ? 1 : !isOpen && wasOpen ? -1 : 0),
    }));
  },
}));
