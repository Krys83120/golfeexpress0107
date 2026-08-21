import React, { useEffect, useState } from "react";
import { AlertTriangle, User, Bike, Store, ChevronDown, ChevronUp } from "lucide-react";
import type { OrderReport, OrderReportStatus } from "@golfeexpress/types";
import { useAdminReportsStore } from "@/store/useAdminReportsStore";

const CATEGORY_LABELS: Record<string, string> = {
  MISSING_ITEMS: "Article(s) manquant(s)",
  WRONG_ITEMS: "Erreur sur les articles",
  DAMAGED_OR_QUALITY: "Produit abîmé / qualité",
  LATE_DELIVERY: "Livraison en retard",
  DELIVERY_NOT_RECEIVED: "Livraison non reçue",
  RIDER_BEHAVIOR: "Comportement du livreur",
  CLIENT_UNREACHABLE: "Client injoignable",
  ADDRESS_ISSUE: "Problème d'adresse",
  PAYMENT_ISSUE: "Problème de paiement",
  STOCK_UNAVAILABLE: "Rupture de stock",
  TECHNICAL_ISSUE: "Problème technique",
  OTHER: "Autre",
};

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

const ROLE_ICON: Record<string, React.ReactNode> = {
  CLIENT: <User size={14} />,
  RIDER: <Bike size={14} />,
  PRO: <Store size={14} />,
};

const ROLE_LABELS: Record<string, string> = {
  CLIENT: "Client",
  RIDER: "Livreur",
  PRO: "Commerçant",
};

const FILTER_TABS: Array<{ key: string; label: string; statuses?: OrderReportStatus[] }> = [
  { key: "open", label: "À traiter", statuses: ["OPEN", "IN_PROGRESS"] as OrderReportStatus[] },
  { key: "resolved", label: "Résolus", statuses: ["RESOLVED"] as OrderReportStatus[] },
  { key: "rejected", label: "Rejetés", statuses: ["REJECTED"] as OrderReportStatus[] },
  { key: "all", label: "Tout" },
];

function ReportCard({ report }: { report: OrderReport }) {
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const reply = useAdminReportsStore((s) => s.reply);
  const setStatus = useAdminReportsStore((s) => s.setStatus);

  const reporterName = report.user ? `${report.user.firstName} ${report.user.lastName}` : "Utilisateur";
  const colors = STATUS_COLORS[report.status] ?? STATUS_COLORS.OPEN;

  async function handleSend(newStatus: OrderReportStatus) {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await reply(report.id, replyText.trim(), newStatus);
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
      await setStatus(report.id, newStatus);
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
            {ROLE_ICON[report.reporterRole] ?? <AlertTriangle size={14} />}
          </div>
          <div>
            <p className="text-sm font-semibold text-nuit">
              {CATEGORY_LABELS[report.category] ?? report.category}
              <span className="ml-2 text-xs font-normal text-gris">
                {ROLE_LABELS[report.reporterRole] ?? report.reporterRole} · {reporterName}
              </span>
            </p>
            <p className="mt-1 text-xs text-gris">
              Commande {report.order?.orderNumber ?? "?"} ·{" "}
              {new Date(report.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
            </p>
            {!expanded && <p className="mt-2 line-clamp-1 text-sm text-nuit/80">{report.message}</p>}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {STATUS_LABELS[report.status] ?? report.status}
          </span>
          {expanded ? <ChevronUp size={16} className="text-gris" /> : <ChevronDown size={16} className="text-gris" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gris-light p-5">
          <p className="whitespace-pre-wrap text-sm text-nuit">{report.message}</p>

          {report.photoUrl && (
            <img
              src={report.photoUrl}
              alt="Photo jointe"
              className="mt-3 max-h-64 rounded-sm border border-gris-light object-cover"
            />
          )}

          {report.adminReply && (
            <div className="mt-4 rounded-sm bg-golfe-green/10 p-3">
              <p className="text-xs font-semibold text-golfe-green-dark">Votre réponse</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-nuit">{report.adminReply}</p>
            </div>
          )}

          <div className="mt-4">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Répondre à cette réclamation..."
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
              {report.status !== "IN_PROGRESS" && (
                <button
                  onClick={() => handleStatusOnly("IN_PROGRESS" as OrderReportStatus)}
                  disabled={submitting}
                  className="text-xs font-semibold text-gris hover:text-nuit"
                >
                  Marquer "En cours"
                </button>
              )}
              {report.status !== "REJECTED" && (
                <button
                  onClick={() => handleStatusOnly("REJECTED" as OrderReportStatus)}
                  disabled={submitting}
                  className="text-xs font-semibold text-gris hover:text-nuit"
                >
                  Rejeter sans réponse
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
 * Centralise TOUTES les réclamations/signalements de la plateforme
 * (Client, Livreur, Pro) -- un seul modèle OrderReport, voir
 * prisma/schema.prisma. L'admin peut filtrer par statut, répondre
 * directement (email envoyé automatiquement à l'auteur, voir
 * reportEmails.ts) et faire évoluer le statut sans forcément répondre
 * (ex: passage en "En cours" pour signaler une prise en charge en interne).
 */
export function ReportsPage() {
  const reports = useAdminReportsStore((s) => s.reports);
  const status = useAdminReportsStore((s) => s.status);
  const error = useAdminReportsStore((s) => s.error);
  const loadReports = useAdminReportsStore((s) => s.loadReports);

  const [activeTab, setActiveTab] = useState("open");

  useEffect(() => {
    const tab = FILTER_TABS.find((t) => t.key === activeTab);
    loadReports(tab?.statuses);
  }, [activeTab]);

  return (
    <div className="flex-1 p-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold text-nuit">Réclamations</h1>
        <p className="text-sm text-gris">
          Réclamations clients, signalements livreurs et commerçants -- répondez directement depuis ici.
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
          <button onClick={() => loadReports(FILTER_TABS.find((t) => t.key === activeTab)?.statuses)} className="font-semibold underline">
            Réessayer
          </button>
        </div>
      )}

      {status === "loading" && reports.length === 0 ? (
        <p className="py-12 text-center text-sm text-gris">Chargement des réclamations...</p>
      ) : reports.length === 0 ? (
        <p className="py-12 text-center text-sm text-gris">Aucune réclamation dans cette catégorie.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}
