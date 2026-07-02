import React from "react";
import { Check, X } from "lucide-react";
import type { PendingValidation } from "@/services/pendingValidationMapper";

interface ValidationCardProps {
  validation: PendingValidation;
  onApprove: () => void;
  onReject: () => void;
}

export function ValidationCard({ validation, onApprove, onReject }: ValidationCardProps) {
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
        </div>
        <p className="text-xs text-gris">{validation.subtitle}</p>
      </div>

      <span className="hidden text-xs text-gris md:block">{validation.submittedAtLabel}</span>

      <div className="flex gap-2">
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
