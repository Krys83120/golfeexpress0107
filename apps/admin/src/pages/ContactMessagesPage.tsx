import React, { useEffect, useState } from "react";
import { Mail, ChevronDown, ChevronUp } from "lucide-react";
import type { ContactMessage, OrderReportStatus } from "@golfeexpress/types";
import { useAdminContactMessagesStore } from "@/store/useAdminContactMessagesStore";

const STATUS_LABELS: Record<OrderReportStatus, string> = {
  OPEN: "Ouvert",
  IN_PROGRESS: "En cours",
  RESOLVED: "Résolu",
  REJECTED: "Rejeté",
} as Record<OrderReportStatus, string>;

const STATUS_COLORS: Record<OrderReportStatus, { bg: string; text: string }> = {
  OPEN: { bg: "#FEF2F2", text: "#DC2626" },
  IN_PROGRESS: { bg: "#FFF3E0", text: "#C2760C" },
  RESOLVED: { bg: "#E8F5E9", text: "#1E8E4A" },
  REJECTED: { bg: "#F3F4F6", text: "#6B7280" },
} as Record<OrderReportStatus, { bg: string; text: string }>;

const FILTER_TABS: Array<{ key: string; label: string; statuses?: OrderReportStatus[] }> = [
  { key: "open", label: "À traiter", statuses: ["OPEN", "IN_PROGRESS"] as OrderReportStatus[] },
  { key: "resolved", label: "Résolus", statuses: ["RESOLVED"] as OrderReportStatus[] },
  { key: "rejected", label: "Rejetés/Spam", statuses: ["REJECTED"] as OrderReportStatus[] },
  { key: "all", label: "Tout" },
];

function MessageCard({ message }: { message: ContactMessage }) {
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const reply = useAdminContactMessagesStore((s) => s.reply);
  const setStatus = useAdminContactMessagesStore((s) => s.setStatus);

  const colors = STATUS_COLORS[message.status] ?? STATUS_COLORS.OPEN;

  async function handleSend(newStatus: OrderReportStatus) {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await reply(message.id, replyText.trim(), newStatus);
      setReplyText("");
      setExpanded(false);
    } catch {
      alert("Impossible d'envoyer la réponse pour le moment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusOnly(newStatus: OrderReportStatus) {
    setSubmitting(true);
    try {
      await setStatus(message.id, newStatus);
    } catch {
      alert("Impossible de mettre à jour le statut pour le moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded bg-white shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-4 p-5 text-left"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gris-light text-nuit">
            <Mail size={14} />
          </div>
          <div>
            <p className="text-sm font-semibold text-nuit">
              {message.subject}
              <span className="ml-2 rounded-full bg-gris-light px-2 py-0.5 text-[10px] font-bold text-gris">
                {message.type}
              </span>
            </p>
            <p className="mt-1 text-xs text-gris">
              {message.name} ({message.email}) ·{" "}
              {new Date(message.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
            </p>
            {!expanded && <p className="mt-2 line-clamp-1 text-sm text-nuit/80">{message.message}</p>}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {STATUS_LABELS[message.status] ?? message.status}
          </span>
          {expanded ? <ChevronUp size={16} className="text-gris" /> : <ChevronDown size={16} className="text-gris" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gris-light p-5">
          <p className="whitespace-pre-wrap text-sm text-nuit">{message.message}</p>

          {message.adminReply && (
            <div className="mt-4 rounded-sm bg-golfe-green/10 p-3">
              <p className="text-xs font-semibold text-golfe-green-dark">Votre réponse</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-nuit">{message.adminReply}</p>
            </div>
          )}

          <div className="mt-4">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Répondre à ${message.name}...`}
              rows={3}
              className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm focus:border-golfe-green focus:outline-none"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleSend("RESOLVED" as OrderReportStatus)}
                disabled={submitting || !replyText.trim()}
                className="rounded-sm bg-golfe-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-golfe-green-dark disabled:opacity-40"
              >
                Répondre et marquer résolu
              </button>
              <button
                onClick={() => handleSend("IN_PROGRESS" as OrderReportStatus)}
                disabled={submitting || !replyText.trim()}
                className="rounded-sm border border-gris-light px-3 py-1.5 text-xs font-semibold text-nuit hover:bg-gris-light disabled:opacity-40"
              >
                Répondre, garder en cours
              </button>
              <span className="mx-1 h-4 w-px bg-gris-light" />
              {message.status !== "IN_PROGRESS" && (
                <button
                  onClick={() => handleStatusOnly("IN_PROGRESS" as OrderReportStatus)}
                  disabled={submitting}
                  className="text-xs font-semibold text-gris hover:text-nuit"
                >
                  Marquer "En cours"
                </button>
              )}
              {message.status !== "REJECTED" && (
                <button
                  onClick={() => handleStatusOnly("REJECTED" as OrderReportStatus)}
                  disabled={submitting}
                  className="text-xs font-semibold text-gris hover:text-nuit"
                >
                  Rejeter / Spam
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Centralise les messages envoyés via le widget "Nous contacter" du site
 * vitrine (model ContactMessage) -- distincte de ReportsPage.tsx
 * (réclamations sur commande, rattachées à un compte). Répondre ici envoie
 * un email au visiteur (voir sendContactMessageRepliedEmail) : l'admin n'a
 * jamais besoin d'ouvrir sa propre messagerie, tout est traité et archivé
 * depuis cette page.
 */
export function ContactMessagesPage() {
  const messages = useAdminContactMessagesStore((s) => s.messages);
  const status = useAdminContactMessagesStore((s) => s.status);
  const error = useAdminContactMessagesStore((s) => s.error);
  const loadMessages = useAdminContactMessagesStore((s) => s.loadMessages);

  const [activeTab, setActiveTab] = useState("open");

  useEffect(() => {
    const tab = FILTER_TABS.find((t) => t.key === activeTab);
    loadMessages(tab?.statuses);
  }, [activeTab]);

  return (
    <div className="flex-1 p-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold text-nuit">Messages</h1>
        <p className="text-sm text-gris">
          Messages reçus via le widget « Nous contacter » du site vitrine -- répondez directement depuis ici.
        </p>
      </div>

      <div className="mb-6 flex gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="rounded-full px-4 py-2 text-sm font-semibold transition-colors"
            style={{
              backgroundColor: activeTab === tab.key ? "#1A1A2E" : "#F3F4F6",
              color: activeTab === tab.key ? "white" : "#6B7280",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {status === "error" && (
        <div className="mb-6 rounded-sm bg-red-50 p-4 text-sm text-red-500">
          {error}{" "}
          <button onClick={() => loadMessages(FILTER_TABS.find((t) => t.key === activeTab)?.statuses)} className="font-semibold underline">
            Réessayer
          </button>
        </div>
      )}

      {status === "loading" && messages.length === 0 ? (
        <p className="py-12 text-center text-sm text-gris">Chargement des messages...</p>
      ) : messages.length === 0 ? (
        <p className="py-12 text-center text-sm text-gris">Aucun message dans cette catégorie.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {messages.map((message) => (
            <MessageCard key={message.id} message={message} />
          ))}
        </div>
      )}
    </div>
  );
}
