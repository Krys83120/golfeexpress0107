import React, { useState } from "react";
import { X, Mail, Send, RefreshCw } from "lucide-react";
import type { Prospect } from "@golfeexpress/types";
import { sendProspectingEmailAction } from "@/services/prospectsApi";

interface ProspectEmailModalProps {
  prospect: Prospect;
  onClose: () => void;
  onSent: (sentAt: string) => void;
}

const defaultIntro = (businessName: string, city: string) =>
  `Bonjour,\n\nNous avons remarqué que ${businessName} propose déjà (ou pourrait proposer) la livraison à ${city}. Do You Geckoo est la plateforme de livraison locale du Golfe de Saint-Tropez, et nous serions ravis de vous compter parmi nos commerçants partenaires.`;

/**
 * Modale d'envoi du mail de prospection (ajout du 26/09/2026, demande de
 * Krys : "configurable et testable pour que je puisse voir à quoi cela
 * ressemble") -- sur le même principe que PremiumUpsellModal.tsx : objet +
 * texte d'accroche modifiables, "Aperçu"/"M'envoyer un test" ne déclenchent
 * jamais l'envoi réel, seul le bouton final le fait, avec confirmation.
 */
export function ProspectEmailModal({ prospect, onClose, onSent }: ProspectEmailModalProps) {
  const [subject, setSubject] = useState(
    `🦎 ${prospect.businessName}, proposez la livraison avec Do You Geckoo`
  );
  const [introText, setIntroText] = useState(defaultIntro(prospect.businessName, prospect.city));
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<"preview" | "test" | "send" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testSentTo, setTestSentTo] = useState<string | null>(null);

  const canAct = subject.trim().length > 0 && introText.trim().length > 0 && loadingAction === null;

  async function handlePreview() {
    if (!canAct) return;
    setLoadingAction("preview");
    setError(null);
    try {
      const result = await sendProspectingEmailAction(prospect.id, { subject, introText, mode: "preview" });
      setPreviewHtml(result.html ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de générer l'aperçu.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleTest() {
    if (!canAct) return;
    setLoadingAction("test");
    setError(null);
    setTestSentTo(null);
    try {
      const result = await sendProspectingEmailAction(prospect.id, { subject, introText, mode: "test" });
      setTestSentTo(result.to ?? "votre adresse");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi du test.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleSend() {
    if (!canAct) return;
    if (!prospect.email) {
      setError("Ce prospect n'a pas encore d'email renseigné — complétez-le avant d'envoyer.");
      return;
    }
    if (!window.confirm(`Envoyer ce mail de prospection à ${prospect.businessName} (${prospect.email}) ?`)) return;
    setLoadingAction("send");
    setError(null);
    try {
      const result = await sendProspectingEmailAction(prospect.id, { subject, introText, mode: "send" });
      if (result.sentAt) onSent(result.sentAt);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi.");
      setLoadingAction(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-nuit">
              🦎 Mail de prospection — {prospect.businessName}
            </h2>
            <p className="text-xs text-gris">
              Destinataire : {prospect.email ?? <span className="text-orange-600">email manquant — complétez la ligne avant d'envoyer</span>}
            </p>
            {prospect.prospectingEmailSentAt && (
              <p className="mt-1 text-xs text-gris">
                Dernier envoi le {new Date(prospect.prospectingEmailSentAt).toLocaleDateString("fr-FR")}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-gris-light">
            <X size={18} />
          </button>
        </div>

        {error && <div className="mb-4 rounded-sm bg-red-50 p-3 text-sm text-red-500">{error}</div>}
        {testSentTo && (
          <div className="mb-4 rounded-sm bg-green-50 p-3 text-sm text-green-700">
            ✅ Mail de test envoyé à {testSentTo} — vérifiez votre boîte mail pour voir le rendu réel.
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gris">
            Objet du mail
          </label>
          <input
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setPreviewHtml(null);
            }}
            className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm outline-none focus:border-nuit"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gris">
            Texte d'accroche — le reste du mail (argumentaire, bouton d'inscription) est généré automatiquement
          </label>
          <textarea
            value={introText}
            onChange={(e) => {
              setIntroText(e.target.value);
              setPreviewHtml(null);
            }}
            rows={5}
            className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm outline-none focus:border-nuit"
          />
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handlePreview}
            disabled={!canAct}
            className="flex items-center gap-1.5 rounded-sm border border-gris-light px-3 py-2 text-xs font-semibold text-nuit hover:bg-gris-light disabled:opacity-50"
          >
            <RefreshCw size={14} className={loadingAction === "preview" ? "animate-spin" : ""} />
            {previewHtml ? "Actualiser l'aperçu" : "Voir l'aperçu"}
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={!canAct}
            className="flex items-center gap-1.5 rounded-sm border border-gris-light px-3 py-2 text-xs font-semibold text-nuit hover:bg-gris-light disabled:opacity-50"
          >
            <Mail size={14} />
            {loadingAction === "test" ? "Envoi..." : "M'envoyer un test"}
          </button>
        </div>

        {previewHtml && (
          <div className="mb-5 overflow-hidden rounded-sm border border-gris-light">
            <iframe title="Aperçu du mail" srcDoc={previewHtml} sandbox="" className="h-[420px] w-full bg-gris-light" />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-gris-light pt-4">
          <button type="button" onClick={onClose} className="rounded-sm px-4 py-2 text-sm text-gris hover:bg-gris-light">
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!canAct || !prospect.email}
            className="flex items-center gap-1.5 rounded-sm bg-nuit px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <Send size={14} />
            {loadingAction === "send" ? "Envoi..." : `Envoyer à ${prospect.businessName}`}
          </button>
        </div>
      </div>
    </div>
  );
}
