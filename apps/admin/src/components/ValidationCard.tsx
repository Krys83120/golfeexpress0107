import React from "react";
import { Check, X, Mail } from "lucide-react";
import type { PendingValidation } from "@/services/pendingValidationMapper";

interface ValidationCardProps {
  validation: PendingValidation;
  onApprove: () => void;
  onReject: () => void;
  /** Envoie le mail "complétez votre dossier" -- uniquement affiché si validation.isDossierIncomplete. */
  onRemind: () => void;
  /** true pendant l'envoi en cours, pour désactiver le bouton et éviter un double-clic. */
  reminding?: boolean;
}

function formatReminderDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function ValidationCard({ validation, onApprove, onReject, onRemind, reminding }: ValidationCardProps) {
  const kindLabel = validation.kind === "PRO" ? "Commerçant" : "Livreur";
  const kindColor = validation.kind === "PRO" ? "#2196F3" : "#FF6B35";

  return (
    <div className="flex items-center gap-4 rounded-sm border border-gris-light p-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gris-light text-xl">
        {validation.emoji}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-nuit">{validation.name}</p>
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ backgroundColor: `${kindColor}1A`, color: kindColor }}
          >
            {kindLabel}
          </span>
          {/* Dossier incomplet (SIRET/Kbis manquant pour un Pro, pièce
              d'identité/IBAN manquant pour un Livreur) -- voir
              isProDossierIncomplete/isRiderDossierIncomplete. Ce compte ne
              pourra jamais être validé en l'état : Approuver échouerait
              silencieusement sur des données provisoires. */}
          {validation.isDossierIncomplete && (
            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-600">
              ⚠️ Dossier incomplet
            </span>
          )}
        </div>
        <p className="text-xs text-gris">{validation.subtitle}</p>
        {validation.lastReminderAt && (
          <p className="mt-0.5 text-[11px] text-gris">
            Dernière relance envoyée le {formatReminderDate(validation.lastReminderAt)}
          </p>
        )}
      </div>

      <span className="hidden text-xs text-gris md:block">{validation.submittedAtLabel}</span>

      <div className="flex gap-2">
        {validation.isDossierIncomplete && (
          <button
            onClick={onRemind}
            disabled={reminding}
            className="flex h-9 items-center gap-1.5 rounded-sm border border-orange-200 bg-orange-50 px-3 text-xs font-semibold text-orange-600 transition-opacity hover:opacity-90 disabled:opacity-50"
            title="Envoyer un mail pour compléter le dossier"
          >
            <Mail size={14} />
            {reminding ? "Envoi..." : "Relancer"}
          </button>
        )}
        <button
          onClick={onApprove}
          className="flex h-9 w-9 items-center justify-center rounded-sm bg-golfe-green text-white transition-opacity hover:opacity-90"
          title="Approuver"
        >
          <Check size={16} />
        </button>
        <button
          onClick={onReject}
          className="flex h-9 w-9 items-center justify-center rounded-sm border-2 border-gris-light text-nuit transition-colors hover:bg-gris-light"
          title="Rejeter"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
