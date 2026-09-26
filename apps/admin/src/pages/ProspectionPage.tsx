import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  ExternalLink,
  Mail,
  Pencil,
  Trash2,
  Download,
  Plus,
  CheckCircle2,
  Eye,
  MousePointerClick,
  RefreshCw,
  X,
  ShoppingBag,
  HelpCircle,
} from "lucide-react";
import { ProCategory } from "@golfeexpress/types";
import type { Prospect } from "@golfeexpress/types";
import {
  fetchProspects,
  createProspect,
  updateProspect,
  deleteProspect,
  seedProspects,
  annotateProspects,
  type CreateProspectInput,
} from "@/services/prospectsApi";
import { downloadCsv } from "@/services/csvExport";
import { ProspectEmailModal } from "@/components/ProspectEmailModal";

const CATEGORY_LABELS: Record<ProCategory, string> = {
  [ProCategory.RESTAURANT]: "Restaurant",
  [ProCategory.BOULANGERIE]: "Boulangerie",
  [ProCategory.BOUCHERIE]: "Boucherie",
  [ProCategory.EPICERIE]: "Épicerie",
  [ProCategory.PHARMACIE]: "Pharmacie",
  [ProCategory.FLEURISTE]: "Fleuriste",
  [ProCategory.LIBRAIRIE]: "Librairie",
  [ProCategory.PARFUMERIE]: "Parfumerie",
  [ProCategory.AUTRE]: "Autre",
};

type StatusFilter = "all" | "not_sent" | "sent" | "opened" | "clicked" | "converted";
type SortBy = "city" | "name";

function formatDateShort(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Page Admin > Prospection (ajout du 26/09/2026, demande de Krys) --
 * démarchage des restaurants/commerces du Golfe de Saint-Tropez pas encore
 * Pro sur la plateforme. Liste de départ constituée par recherche web (voir
 * lib/prospectSeedData.ts côté API), complétable/corrigeable à la main
 * ensuite. Export CSV, filtres ville/catégorie/statut, tri, lien fiche
 * Google, et envoi de mail de prospection configurable/testable par ligne
 * (voir ProspectEmailModal).
 */
export function ProspectionPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [annotating, setAnnotating] = useState(false);

  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [takeawayFilter, setTakeawayFilter] = useState<"all" | "yes" | "unknown">("all");
  const [sortBy, setSortBy] = useState<SortBy>("city");

  const [emailModalProspect, setEmailModalProspect] = useState<Prospect | null>(null);
  const [formModalProspect, setFormModalProspect] = useState<Prospect | "new" | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    fetchProspects()
      .then(setProspects)
      .catch((err) => setError(err instanceof Error ? err.message : "Impossible de charger la liste."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const cities = useMemo(
    () => Array.from(new Set(prospects.map((p) => p.city))).sort((a, b) => a.localeCompare(b, "fr")),
    [prospects]
  );

  function statusOf(p: Prospect): StatusFilter {
    if (p.convertedAt) return "converted";
    if (p.prospectingEmailClickedAt) return "clicked";
    if (p.prospectingEmailOpenedAt) return "opened";
    if (p.prospectingEmailSentAt) return "sent";
    return "not_sent";
  }

  const filtered = useMemo(() => {
    let list = prospects;
    if (cityFilter !== "all") list = list.filter((p) => p.city === cityFilter);
    if (categoryFilter !== "all") list = list.filter((p) => p.category === categoryFilter);
    if (statusFilter !== "all") list = list.filter((p) => statusOf(p) === statusFilter);
    if (takeawayFilter === "yes") list = list.filter((p) => p.offersTakeaway === true);
    if (takeawayFilter === "unknown") list = list.filter((p) => p.offersTakeaway === null);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.businessName.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          (p.email ?? "").toLowerCase().includes(q)
      );
    }
    const sorted = [...list];
    if (sortBy === "name") {
      sorted.sort((a, b) => a.businessName.localeCompare(b.businessName, "fr"));
    } else {
      sorted.sort((a, b) => a.city.localeCompare(b.city, "fr") || a.businessName.localeCompare(b.businessName, "fr"));
    }
    return sorted;
  }, [prospects, cityFilter, categoryFilter, statusFilter, takeawayFilter, search, sortBy]);

  const stats = useMemo(() => {
    const total = prospects.length;
    const sent = prospects.filter((p) => p.prospectingEmailSentAt).length;
    const opened = prospects.filter((p) => p.prospectingEmailOpenedAt).length;
    const clicked = prospects.filter((p) => p.prospectingEmailClickedAt).length;
    const converted = prospects.filter((p) => p.convertedAt).length;
    return { total, sent, opened, clicked, converted };
  }, [prospects]);

  function handleExportCsv() {
    downloadCsv(
      "prospection-golfe-saint-tropez.csv",
      ["Nom", "Ville", "Catégorie", "Email", "Téléphone", "Site web", "Fiche Google", "Envoyé le", "Ouvert le", "Cliqué le", "Inscrit le"],
      filtered.map((p) => [
        p.businessName,
        p.city,
        CATEGORY_LABELS[p.category] ?? p.category,
        p.email ?? "",
        p.phone ?? "",
        p.websiteUrl ?? "",
        p.googleMapsUrl ?? "",
        formatDateShort(p.prospectingEmailSentAt),
        formatDateShort(p.prospectingEmailOpenedAt),
        formatDateShort(p.prospectingEmailClickedAt),
        formatDateShort(p.convertedAt),
      ])
    );
  }

  async function handleSeed() {
    setSeeding(true);
    setError(null);
    setSeedMessage(null);
    try {
      const result = await seedProspects();
      load();
      setSeedMessage(
        result.imported > 0
          ? `${result.imported} nouveau${result.imported > 1 ? "x" : ""} prospect${result.imported > 1 ? "s" : ""} importé${result.imported > 1 ? "s" : ""} (${result.skipped} déjà présent${result.skipped > 1 ? "s" : ""}).`
          : "Aucun nouveau prospect à importer -- la liste de départ est déjà entièrement chargée."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'import.");
    } finally {
      setSeeding(false);
    }
  }

  async function handleAnnotate() {
    setAnnotating(true);
    setError(null);
    setSeedMessage(null);
    try {
      const result = await annotateProspects();
      load();
      const parts: string[] = [];
      if (result.updated > 0) parts.push(`${result.updated} mis à jour`);
      if (result.deleted > 0) parts.push(`${result.deleted} retiré${result.deleted > 1 ? "s" : ""} (pas de vente à emporter)`);
      setSeedMessage(
        parts.length > 0 ? parts.join(", ") + "." : "Rien à mettre à jour -- déjà vérifié."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la vérification.");
    } finally {
      setAnnotating(false);
    }
  }

  async function handleDelete(p: Prospect) {
    if (!window.confirm(`Supprimer ${p.businessName} de la liste de prospection ?`)) return;
    try {
      await deleteProspect(p.id);
      setProspects((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la suppression.");
    }
  }

  return (
    <div className="flex-1 p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-nuit">Prospection</h1>
          <p className="text-sm text-gris">
            Restaurants et commerces du Golfe de Saint-Tropez pas encore inscrits sur Do You Geckoo
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSeed}
            disabled={seeding}
            title="Réimporte la liste de départ (recherche web) -- sans jamais créer de doublon, n'ajoute que les nouveaux établissements"
            className="flex items-center gap-1.5 rounded-sm border border-gris-light bg-white px-3 py-2 text-sm font-semibold text-nuit hover:bg-gris-light disabled:opacity-50"
          >
            <RefreshCw size={16} className={seeding ? "animate-spin" : ""} />
            {seeding ? "Import..." : "Importer la liste de départ"}
          </button>
          <button
            onClick={handleAnnotate}
            disabled={annotating}
            title="Vérifie vente à emporter et présence Uber Eats (recherche web classique -- jamais via Uber Eats/Deliveroo/Just Eat directement), et retire les commerces qui ne font pas de vente à emporter"
            className="flex items-center gap-1.5 rounded-sm border border-gris-light bg-white px-3 py-2 text-sm font-semibold text-nuit hover:bg-gris-light disabled:opacity-50"
          >
            <ShoppingBag size={16} className={annotating ? "animate-pulse" : ""} />
            {annotating ? "Vérification..." : "Vérifier vente à emporter / Uber Eats"}
          </button>
          <button
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 rounded-sm border border-gris-light bg-white px-3 py-2 text-sm font-semibold text-nuit hover:bg-gris-light disabled:opacity-50"
          >
            <Download size={16} />
            Exporter CSV
          </button>
          <button
            onClick={() => setFormModalProspect("new")}
            className="flex items-center gap-1.5 rounded-sm bg-golfe-green px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus size={16} />
            Ajouter un prospect
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-sm bg-red-50 p-4 text-sm text-red-500">{error}</div>}
      {seedMessage && (
        <div className="mb-4 flex items-center justify-between rounded-sm bg-blue-50 p-4 text-sm text-blue-700">
          <span>{seedMessage}</span>
          <button onClick={() => setSeedMessage(null)} className="text-blue-700 hover:opacity-70">
            <X size={14} />
          </button>
        </div>
      )}

      {/* STATS */}
      <div className="mb-6 grid grid-cols-5 gap-4">
        <StatBox label="Total" value={stats.total} />
        <StatBox label="Mails envoyés" value={stats.sent} icon={<Mail size={14} />} />
        <StatBox label="Ouverts" value={stats.opened} icon={<Eye size={14} />} />
        <StatBox label="Cliqués" value={stats.clicked} icon={<MousePointerClick size={14} />} />
        <StatBox label="Inscrits" value={stats.converted} icon={<CheckCircle2 size={14} />} accent="#2ECC71" />
      </div>

      {/* FILTRES */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-sm bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2 rounded-sm border border-gris-light px-3 py-1.5">
          <Search size={14} className="text-gris" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un nom, une ville, un email..."
            className="w-64 text-sm outline-none"
          />
        </div>
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="rounded-sm border border-gris-light px-2 py-1.5 text-sm"
        >
          <option value="all">Toutes les villes</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-sm border border-gris-light px-2 py-1.5 text-sm"
        >
          <option value="all">Toutes les catégories</option>
          {Object.values(ProCategory).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-sm border border-gris-light px-2 py-1.5 text-sm"
        >
          <option value="all">Tous les statuts</option>
          <option value="not_sent">Pas encore contacté</option>
          <option value="sent">Mail envoyé</option>
          <option value="opened">Mail ouvert</option>
          <option value="clicked">A cliqué</option>
          <option value="converted">Inscrit ✅</option>
        </select>
        <select
          value={takeawayFilter}
          onChange={(e) => setTakeawayFilter(e.target.value as "all" | "yes" | "unknown")}
          className="rounded-sm border border-gris-light px-2 py-1.5 text-sm"
        >
          <option value="all">Vente à emporter : tous</option>
          <option value="yes">🥡 Vente à emporter confirmée</option>
          <option value="unknown">À vérifier</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="rounded-sm border border-gris-light px-2 py-1.5 text-sm"
        >
          <option value="city">Trier par ville</option>
          <option value="name">Trier par ordre alphabétique</option>
        </select>
        <span className="ml-auto text-xs text-gris">{filtered.length} résultat(s)</span>
      </div>

      {/* TABLE / ÉTAT VIDE */}
      {loading ? (
        <div className="rounded-sm bg-white p-10 text-center text-sm text-gris shadow-sm">Chargement...</div>
      ) : prospects.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-sm bg-white p-12 text-center shadow-sm">
          <span className="text-4xl">🔍</span>
          <div>
            <p className="font-semibold text-nuit">Aucun prospect pour l'instant</p>
            <p className="mt-1 text-sm text-gris">
              Chargez la liste de départ (recherche web sur les 10 communes du Golfe de Saint-Tropez) pour commencer
              à démarcher des restaurants et commerces.
            </p>
          </div>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-1.5 rounded-sm bg-nuit px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <RefreshCw size={14} className={seeding ? "animate-spin" : ""} />
            {seeding ? "Import..." : "Charger la liste de départ"}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-sm bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gris-light text-left text-[11px] font-semibold uppercase tracking-wide text-gris">
                <th className="px-4 py-3">Commerce</th>
                <th className="px-4 py-3">Ville</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3" title="Vente à emporter / présence Uber Eats -- voir bouton 'Vérifier vente à emporter / Uber Eats'">
                  Livraison
                </th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const status = statusOf(p);
                return (
                  <tr key={p.id} className="border-b border-gris-light/60 hover:bg-gris-light/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-nuit">{p.businessName}</p>
                        {p.googleMapsUrl && (
                          <a
                            href={p.googleMapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="Voir la fiche Google"
                            className="text-gris hover:text-nuit"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                      {p.websiteUrl && (
                        <a
                          href={p.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-gris hover:underline"
                        >
                          {p.websiteUrl.replace(/^https?:\/\//, "")}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gris">{p.city}</td>
                    <td className="px-4 py-3 text-gris">{CATEGORY_LABELS[p.category] ?? p.category}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1">
                        {p.offersTakeaway === true && (
                          <span
                            title="Vente à emporter confirmée"
                            className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700"
                          >
                            <ShoppingBag size={11} /> Emporter
                          </span>
                        )}
                        {p.offersTakeaway === null && (
                          <span
                            title="Vente à emporter pas encore vérifiée"
                            className="inline-flex items-center gap-1 rounded-full bg-gris-light/60 px-2 py-0.5 text-[11px] font-semibold text-gris"
                          >
                            <HelpCircle size={11} /> À vérifier
                          </span>
                        )}
                        {p.advertisesUberEats === true && (
                          <span
                            title="Affiche Uber Eats sur ses propres canaux"
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                            style={{ backgroundColor: "#06C167" }}
                          >
                            Uber Eats
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {p.email ? (
                        <span className="text-nuit">{p.email}</span>
                      ) : (
                        <span className="text-orange-600">Email manquant</span>
                      )}
                      {p.phone && <p className="text-xs text-gris">{p.phone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={status} sentAt={p.prospectingEmailSentAt} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setEmailModalProspect(p)}
                          title="Envoyer un mail de prospection"
                          className="flex h-8 w-8 items-center justify-center rounded-sm border border-gris-light text-nuit hover:bg-gris-light"
                        >
                          <Mail size={14} />
                        </button>
                        <button
                          onClick={() => setFormModalProspect(p)}
                          title="Modifier"
                          className="flex h-8 w-8 items-center justify-center rounded-sm border border-gris-light text-nuit hover:bg-gris-light"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          title="Supprimer"
                          className="flex h-8 w-8 items-center justify-center rounded-sm border border-gris-light text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {emailModalProspect && (
        <ProspectEmailModal
          prospect={emailModalProspect}
          onClose={() => setEmailModalProspect(null)}
          onSent={(sentAt) => {
            setProspects((prev) =>
              prev.map((p) =>
                p.id === emailModalProspect.id
                  ? { ...p, prospectingEmailSentAt: sentAt, prospectingEmailOpenedAt: null, prospectingEmailClickedAt: null }
                  : p
              )
            );
          }}
        />
      )}

      {formModalProspect && (
        <ProspectFormModal
          prospect={formModalProspect === "new" ? null : formModalProspect}
          onClose={() => setFormModalProspect(null)}
          onSaved={(saved) => {
            setProspects((prev) =>
              formModalProspect === "new" ? [...prev, saved] : prev.map((p) => (p.id === saved.id ? saved : p))
            );
            setFormModalProspect(null);
          }}
        />
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-sm bg-white p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs text-gris">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-2xl font-extrabold" style={{ color: accent ?? "#1A1A2E" }}>
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
  sentAt,
}: {
  status: StatusFilter;
  sentAt: string | null;
}) {
  if (status === "converted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
        <CheckCircle2 size={12} /> Inscrit
      </span>
    );
  }
  if (status === "clicked") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
        <MousePointerClick size={12} /> A cliqué
      </span>
    );
  }
  if (status === "opened") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-700">
        <Eye size={12} /> Ouvert
      </span>
    );
  }
  if (status === "sent") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gris-light px-2.5 py-1 text-[11px] font-semibold text-nuit">
        <Mail size={12} /> Envoyé le {formatDateShort(sentAt)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gris-light/60 px-2.5 py-1 text-[11px] font-semibold text-gris">
      Pas contacté
    </span>
  );
}

/** Modale d'ajout/édition manuelle -- Krys s'en sert pour compléter un email manquant ou ajouter un contact qu'elle connaît déjà. */
function ProspectFormModal({
  prospect,
  onClose,
  onSaved,
}: {
  prospect: Prospect | null;
  onClose: () => void;
  onSaved: (p: Prospect) => void;
}) {
  const [form, setForm] = useState<CreateProspectInput>({
    businessName: prospect?.businessName ?? "",
    city: prospect?.city ?? "",
    category: prospect?.category ?? ProCategory.RESTAURANT,
    email: prospect?.email ?? "",
    phone: prospect?.phone ?? "",
    websiteUrl: prospect?.websiteUrl ?? "",
    googleMapsUrl: prospect?.googleMapsUrl ?? "",
    notes: prospect?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof CreateProspectInput>(key: K, value: CreateProspectInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.businessName.trim() || !form.city.trim()) {
      setError("Le nom et la ville sont requis.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = prospect ? await updateProspect(prospect.id, form) : await createProspect(form);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between">
          <h2 className="font-heading text-lg font-bold text-nuit">
            {prospect ? `Modifier ${prospect.businessName}` : "Ajouter un prospect"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-gris-light">
            <X size={18} />
          </button>
        </div>

        {error && <div className="mb-4 rounded-sm bg-red-50 p-3 text-sm text-red-500">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nom du commerce" value={form.businessName} onChange={(v) => set("businessName", v)} full />
          <Field label="Ville" value={form.city} onChange={(v) => set("city", v)} />
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gris">
              Catégorie
            </label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm outline-none focus:border-nuit"
            >
              {Object.values(ProCategory).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <Field label="Email" value={form.email ?? ""} onChange={(v) => set("email", v)} full />
          <Field label="Téléphone" value={form.phone ?? ""} onChange={(v) => set("phone", v)} />
          <Field label="Site web" value={form.websiteUrl ?? ""} onChange={(v) => set("websiteUrl", v)} />
          <Field label="Lien fiche Google" value={form.googleMapsUrl ?? ""} onChange={(v) => set("googleMapsUrl", v)} full />
          <Field label="Notes" value={form.notes ?? ""} onChange={(v) => set("notes", v)} full />
        </div>

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-gris-light pt-4">
          <button type="button" onClick={onClose} className="rounded-sm px-4 py-2 text-sm text-gris hover:bg-gris-light">
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-sm bg-nuit px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gris">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm outline-none focus:border-nuit"
      />
    </div>
  );
}
