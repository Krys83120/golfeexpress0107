import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, FlaskConical, Plus, Trash2, X } from "lucide-react";
import {
  fetchStudies,
  createStudy,
  updateStudy,
  deleteStudy,
  type MarketStudy,
  type StudyAction,
  type StudyAudience,
  type StudyInput,
} from "@/services/studiesApi";

const AUDIENCE_LABELS: Record<StudyAudience, string> = {
  MERCHANTS: "Commerçants",
  CLIENTS: "Clients",
  RIDERS: "Livreurs",
};

const AUDIENCE_COLORS: Record<StudyAudience, { bg: string; text: string }> = {
  MERCHANTS: { bg: "#E8F5E9", text: "#1E8E4A" },
  CLIENTS: { bg: "#EFF6FF", text: "#2563EB" },
  RIDERS: { bg: "#FFF3E0", text: "#C2760C" },
};

type Filter = "all" | StudyAudience;

const FILTER_TABS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "Toutes" },
  { key: "MERCHANTS", label: "Commerçants" },
  { key: "CLIENTS", label: "Clients" },
  { key: "RIDERS", label: "Livreurs" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function newActionId(): string {
  return `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function StudyCard({
  study,
  onChanged,
  onDeleted,
}: {
  study: MarketStudy;
  onChanged: (s: MarketStudy) => void;
  onDeleted: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [newAction, setNewAction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actions = Array.isArray(study.actions) ? study.actions : [];
  const doneCount = actions.filter((a) => a.done).length;
  const colors = AUDIENCE_COLORS[study.audience] ?? AUDIENCE_COLORS.MERCHANTS;

  async function saveActions(next: StudyAction[]) {
    setBusy(true);
    setError(null);
    try {
      const updated = await updateStudy(study.id, { actions: next });
      onChanged(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer.");
    } finally {
      setBusy(false);
    }
  }

  function toggleAction(id: string) {
    saveActions(actions.map((a) => (a.id === id ? { ...a, done: !a.done } : a)));
  }

  function removeAction(id: string) {
    saveActions(actions.filter((a) => a.id !== id));
  }

  function addAction() {
    const text = newAction.trim();
    if (!text) return;
    setNewAction("");
    saveActions([...actions, { id: newActionId(), text, done: false }]);
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer l'étude « ${study.title} » ? Cette action est définitive.`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteStudy(study.id);
      onDeleted(study.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
      setBusy(false);
    }
  }

  return (
    <div className="rounded bg-white shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-4 p-5 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-nuit">{study.title}</p>
          <p className="mt-1 text-xs text-gris">
            {formatDate(study.createdAt)}
            {study.rounds != null && study.agents != null
              ? ` · ${study.agents} agents, ${study.rounds} tours`
              : ""}
            {actions.length > 0 ? ` · ${doneCount}/${actions.length} actions faites` : ""}
          </p>
          {!expanded && study.summary && <p className="mt-2 text-sm text-nuit/80">{study.summary}</p>}
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {AUDIENCE_LABELS[study.audience] ?? study.audience}
          </span>
          {expanded ? <ChevronUp size={16} className="text-gris" /> : <ChevronDown size={16} className="text-gris" />}
        </div>
      </button>

      {expanded && (
        <div className="space-y-5 border-t border-gris-light p-5">
          {study.summary && (
            <div className="rounded-sm bg-golfe-green/10 p-3">
              <p className="text-xs font-semibold text-golfe-green-dark">En une phrase</p>
              <p className="mt-1 text-sm text-nuit">{study.summary}</p>
            </div>
          )}

          {study.question && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gris">Question posée</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-nuit">{study.question}</p>
            </div>
          )}

          {study.findings && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gris">Constats</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-nuit">{study.findings}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gris">Actions à faire</p>
            <ul className="mt-2 space-y-1.5">
              {actions.map((a) => (
                <li key={a.id} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={a.done}
                    disabled={busy}
                    onChange={() => toggleAction(a.id)}
                    className="mt-1 h-4 w-4 cursor-pointer"
                  />
                  <span className={`flex-1 text-sm ${a.done ? "text-gris line-through" : "text-nuit"}`}>{a.text}</span>
                  <button
                    onClick={() => removeAction(a.id)}
                    disabled={busy}
                    className="text-gris hover:text-corail"
                    aria-label="Retirer cette action"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
              {actions.length === 0 && <li className="text-sm text-gris">Aucune action pour le moment.</li>}
            </ul>
            <div className="mt-3 flex gap-2">
              <input
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addAction();
                }}
                placeholder="Ajouter une action"
                className="flex-1 rounded-sm border border-gris-light px-3 py-2 text-sm"
              />
              <button
                onClick={addAction}
                disabled={busy || !newAction.trim()}
                className="rounded-sm bg-golfe-green px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                Ajouter
              </button>
            </div>
          </div>

          {study.limitsNote && (
            <p className="rounded-sm bg-gris-light/60 p-3 text-xs text-nuit/80">
              <span className="font-semibold">À garder en tête : </span>
              {study.limitsNote}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gris-light pt-3">
            <p className="text-xs text-gris">
              {study.simulationId ? `Simulation ${study.simulationId}` : ""}
              {study.simulationId && study.reportId ? " · " : ""}
              {study.reportId ? `Rapport ${study.reportId}` : ""}
            </p>
            <button
              onClick={handleDelete}
              disabled={busy}
              className="flex items-center gap-1.5 text-xs font-semibold text-corail hover:underline disabled:opacity-40"
            >
              <Trash2 size={13} /> Supprimer
            </button>
          </div>
          {error && <p className="text-xs text-corail">{error}</p>}
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = {
  audience: "MERCHANTS" as StudyAudience,
  title: "",
  question: "",
  summary: "",
  findings: "",
  actionsText: "",
  simulationId: "",
  reportId: "",
  rounds: "",
  agents: "",
  limitsNote: "",
};

function StudyFormModal({ onClose, onCreated }: { onClose: () => void; onCreated: (s: MarketStudy) => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Le titre est requis.");
      return;
    }
    setSaving(true);
    setError(null);
    const actions: StudyAction[] = form.actionsText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((text) => ({ id: newActionId(), text, done: false }));
    const input: StudyInput = {
      audience: form.audience,
      title: form.title.trim(),
      question: form.question.trim() || null,
      summary: form.summary.trim() || null,
      findings: form.findings.trim() || null,
      actions,
      simulationId: form.simulationId.trim() || null,
      reportId: form.reportId.trim() || null,
      rounds: form.rounds.trim() ? Number(form.rounds) : null,
      agents: form.agents.trim() ? Number(form.agents) : null,
      limitsNote: form.limitsNote.trim() || null,
    };
    try {
      const created = await createStudy(input);
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer l'étude.");
    } finally {
      setSaving(false);
    }
  }

  const fieldClass = "mt-1 w-full rounded-sm border border-gris-light px-3 py-2 text-sm";
  const labelClass = "block text-xs font-semibold text-gris";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-4 rounded bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-extrabold text-nuit">Nouvelle étude</h2>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X size={18} className="text-gris" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Public étudié
            <select
              value={form.audience}
              onChange={(e) => set("audience", e.target.value as StudyAudience)}
              className={fieldClass}
            >
              <option value="MERCHANTS">Commerçants</option>
              <option value="CLIENTS">Clients</option>
              <option value="RIDERS">Livreurs</option>
            </select>
          </label>
          <label className={labelClass}>
            Titre
            <input value={form.title} onChange={(e) => set("title", e.target.value)} className={fieldClass} />
          </label>
        </div>

        <label className={labelClass}>
          Question posée à MiroFish
          <textarea value={form.question} onChange={(e) => set("question", e.target.value)} rows={3} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Résumé en une phrase
          <input value={form.summary} onChange={(e) => set("summary", e.target.value)} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Constats
          <textarea value={form.findings} onChange={(e) => set("findings", e.target.value)} rows={5} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Actions à faire (une par ligne)
          <textarea value={form.actionsText} onChange={(e) => set("actionsText", e.target.value)} rows={4} className={fieldClass} />
        </label>

        <div className="grid gap-4 sm:grid-cols-4">
          <label className={`${labelClass} sm:col-span-2`}>
            Identifiant de simulation
            <input value={form.simulationId} onChange={(e) => set("simulationId", e.target.value)} className={fieldClass} />
          </label>
          <label className={labelClass}>
            Agents
            <input type="number" min={0} value={form.agents} onChange={(e) => set("agents", e.target.value)} className={fieldClass} />
          </label>
          <label className={labelClass}>
            Tours
            <input type="number" min={0} value={form.rounds} onChange={(e) => set("rounds", e.target.value)} className={fieldClass} />
          </label>
        </div>
        <label className={labelClass}>
          Identifiant du rapport
          <input value={form.reportId} onChange={(e) => set("reportId", e.target.value)} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Limites à garder en tête
          <textarea value={form.limitsNote} onChange={(e) => set("limitsNote", e.target.value)} rows={2} className={fieldClass} />
        </label>

        {error && <p className="text-sm text-corail">{error}</p>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-sm px-4 py-2 text-sm font-semibold text-gris">
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-sm bg-golfe-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Page Admin > Études (ajout du 16/10/2026, demande de Krys) -- garde la
 * trace des études de marché MiroFish (commerçants, clients, livreurs) et
 * des actions qui en découlent. MiroFish tourne en local : les résultats
 * sont saisis ici à la main, aucune liaison automatique.
 */
export function StudiesPage() {
  const [studies, setStudies] = useState<MarketStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [showForm, setShowForm] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    fetchStudies()
      .then(setStudies)
      .catch((err) => setError(err instanceof Error ? err.message : "Impossible de charger les études."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? studies : studies.filter((s) => s.audience === filter)),
    [studies, filter]
  );

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FlaskConical size={22} className="text-golfe-green" />
          <div>
            <h1 className="font-heading text-2xl font-extrabold text-nuit">Études de marché</h1>
            <p className="text-sm text-gris">Résultats des simulations MiroFish et actions à mener.</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-sm bg-golfe-green px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus size={16} /> Nouvelle étude
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className="rounded-full px-4 py-1.5 text-sm font-semibold"
            style={{
              backgroundColor: filter === tab.key ? "#2ECC71" : "#FFFFFF",
              color: filter === tab.key ? "#FFFFFF" : "#6B7280",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-corail">{error}</p>}
      {loading && <p className="text-sm text-gris">Chargement…</p>}

      {!loading && filtered.length === 0 && !error && (
        <p className="text-sm text-gris">
          Aucune étude pour le moment. Si la table vient d'être créée, vérifiez que le script add_market_studies_table.sql a bien
          été exécuté dans Supabase.
        </p>
      )}

      <div className="space-y-4">
        {filtered.map((s) => (
          <StudyCard
            key={s.id}
            study={s}
            onChanged={(updated) => setStudies((list) => list.map((x) => (x.id === updated.id ? updated : x)))}
            onDeleted={(id) => setStudies((list) => list.filter((x) => x.id !== id))}
          />
        ))}
      </div>

      {showForm && (
        <StudyFormModal onClose={() => setShowForm(false)} onCreated={(s) => setStudies((list) => [s, ...list])} />
      )}
    </div>
  );
}
