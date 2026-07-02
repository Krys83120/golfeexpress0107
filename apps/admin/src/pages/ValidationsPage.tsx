import React, { useEffect, useState } from "react";
import { ValidationCard } from "@/components/ValidationCard";
import { useAdminDashboardStore } from "@/store/useAdminDashboardStore";

type ValidationKind = "PRO" | "RIDER";
type FilterKind = "ALL" | ValidationKind;

export function ValidationsPage() {
  const pendingValidations = useAdminDashboardStore((s) => s.pendingValidations);
  const status = useAdminDashboardStore((s) => s.status);
  const error = useAdminDashboardStore((s) => s.error);
  const loadPendingValidations = useAdminDashboardStore((s) => s.loadPendingValidations);
  const approve = useAdminDashboardStore((s) => s.approve);
  const reject = useAdminDashboardStore((s) => s.reject);
  const [filter, setFilter] = useState<FilterKind>("ALL");

  useEffect(() => {
    loadPendingValidations();
  }, []);

  const filtered = pendingValidations.filter((v) => filter === "ALL" || v.kind === filter);
  const proCount = pendingValidations.filter((v) => v.kind === "PRO").length;
  const riderCount = pendingValidations.filter((v) => v.kind === "RIDER").length;

  return (
    <div className="flex-1 p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-nuit">Validations KYC</h1>
          <p className="text-sm text-gris">{pendingValidations.length} demandes en attente de traitement</p>
        </div>
        <div className="flex gap-2 rounded-sm bg-gris-light p-1">
          <FilterTab label={`Toutes (${pendingValidations.length})`} active={filter === "ALL"} onClick={() => setFilter("ALL")} />
          <FilterTab label={`Commerçants (${proCount})`} active={filter === "PRO"} onClick={() => setFilter("PRO")} />
          <FilterTab label={`Livreurs (${riderCount})`} active={filter === "RIDER"} onClick={() => setFilter("RIDER")} />
        </div>
      </div>

      {status === "error" && <div className="mb-6 rounded-sm bg-red-50 p-4 text-sm text-red-500">{error}</div>}

      <div className="rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        {status === "loading" && pendingValidations.length === 0 ? (
          <p className="py-12 text-center text-sm text-gris">Chargement des validations...</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <span className="text-5xl">✅</span>
            <p className="mt-3 text-sm text-gris">Aucune validation en attente dans cette catégorie</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((validation) => (
              <div key={validation.id} className="flex flex-col gap-3 rounded-sm border border-gris-light p-1">
                <ValidationCard
                  validation={validation}
                  onApprove={() => approve(validation.id, validation.kind)}
                  onReject={() => reject(validation.id, validation.kind)}
                />
                <div className="flex gap-2 px-4 pb-3">
                  {(validation.kind === "PRO"
                    ? ["SIRET", "Photos boutique", "RIB"]
                    : ["Pièce d'identité", "Permis de conduire", "RIB"]
                  ).map((doc) => (
                    <span key={doc} className="rounded-sm bg-gris-light px-2.5 py-1 text-xs text-gris">
                      📎 {doc}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-sm px-4 py-2 text-sm font-semibold transition-colors"
      style={{
        backgroundColor: active ? "white" : "transparent",
        color: active ? "#1A1A2E" : "#6B7280",
        boxShadow: active ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
      }}
    >
      {label}
    </button>
  );
}
