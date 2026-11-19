import React, { useEffect, useState } from "react";
import { Upload, Trash2, ArrowUp, ArrowDown, Plus, CheckCircle2 } from "lucide-react";
import {
  fetchFooterPartners,
  saveFooterPartners,
  newFooterPartnerId,
  uploadFooterPartnerLogo,
  type FooterPartner,
} from "@/services/brandingApi";

const MAX_PARTNERS = 24;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/** Ajoute "https://" si l'adresse n'a pas de schéma, et refuse tout autre schéma que http(s). */
function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  if (!/^https?:\/\/[^\s]+\.[^\s]+$/i.test(withScheme)) return null;
  return withScheme;
}

/**
 * Section "Partenaires du footer" (Admin > Branding) -- logos + liens
 * affichés au-dessus de "Livraison par ville" sur le site vitrine. Le logo
 * est envoyé dès qu'il est choisi ; la liste (noms, liens, ordre) n'est
 * publiée sur le site qu'au clic sur "Enregistrer".
 */
export function FooterPartnersSection() {
  const [partners, setPartners] = useState<FooterPartner[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Formulaire d'ajout
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchFooterPartners().then((items) => {
      setPartners(items);
      setLoaded(true);
    });
  }, []);

  function checkLogoFile(file: File): string | null {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      return "Format non supporté : utilisez un PNG, JPEG ou WebP.";
    }
    if (file.size > MAX_LOGO_BYTES) return "Logo trop lourd (2 Mo maximum).";
    return null;
  }

  function updatePartner(id: string, patch: Partial<FooterPartner>) {
    setPartners((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setDirty(true);
    setSaved(false);
  }

  function movePartner(index: number, delta: -1 | 1) {
    setPartners((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
    setSaved(false);
  }

  function removePartner(id: string) {
    setPartners((prev) => prev.filter((p) => p.id !== id));
    setDirty(true);
    setSaved(false);
  }

  async function handleReplaceLogo(partner: FooterPartner, file: File) {
    const problem = checkLogoFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setUploadingId(partner.id);
    try {
      const logoUrl = await uploadFooterPartnerLogo(partner.id, file);
      updatePartner(partner.id, { logoUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'envoyer le logo.");
    } finally {
      setUploadingId(null);
    }
  }

  async function handleAdd() {
    setError(null);
    const name = newName.trim();
    const url = normalizeUrl(newUrl);
    if (!name) return setError("Indiquez le nom du partenaire.");
    if (!url) return setError("Le lien n'est pas valide (exemple : https://www.exemple.fr).");
    if (!newLogoFile) return setError("Choisissez le logo du partenaire.");
    const problem = checkLogoFile(newLogoFile);
    if (problem) return setError(problem);
    if (partners.length >= MAX_PARTNERS) return setError(`Maximum ${MAX_PARTNERS} partenaires.`);

    setAdding(true);
    try {
      const id = newFooterPartnerId();
      const logoUrl = await uploadFooterPartnerLogo(id, newLogoFile);
      setPartners((prev) => [...prev, { id, name, url, logoUrl }]);
      setNewName("");
      setNewUrl("");
      setNewLogoFile(null);
      setDirty(true);
      setSaved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'ajouter ce partenaire.");
    } finally {
      setAdding(false);
    }
  }

  async function handleSave() {
    setError(null);
    const cleaned: FooterPartner[] = [];
    for (const p of partners) {
      const url = normalizeUrl(p.url);
      if (!p.name.trim()) return setError("Un partenaire n'a pas de nom.");
      if (!url) return setError(`Le lien de « ${p.name} » n'est pas valide.`);
      cleaned.push({ ...p, name: p.name.trim(), url });
    }
    setSaving(true);
    try {
      await saveFooterPartners(cleaned);
      setPartners(cleaned);
      setDirty(false);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 rounded bg-white p-6 shadow-sm">
      <h2 className="font-heading text-base font-bold text-nuit">5. Partenaires du footer (site vitrine)</h2>
      <p className="mt-1 text-sm text-gris">
        Logos et liens affichés en bas du site doyougeckoo.fr, juste au-dessus de « Livraison par ville ». Chaque logo
        s'affiche sur une pastille blanche et ouvre le lien du partenaire dans un nouvel onglet. Les changements
        apparaissent sur le site <strong>en quelques secondes après « Enregistrer »</strong>, sans redéploiement.
      </p>

      {!loaded ? (
        <p className="mt-4 text-sm text-gris">Chargement…</p>
      ) : (
        <>
          {partners.length === 0 ? (
            <p className="mt-4 rounded-sm bg-gris-light p-3 text-sm text-gris">
              Aucun partenaire pour le moment : la section n'apparaît pas sur le site.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {partners.map((partner, index) => (
                <li key={partner.id} className="flex flex-col gap-3 rounded-sm border border-gris-light p-3 sm:flex-row sm:items-center">
                  <div className="flex h-14 w-36 shrink-0 items-center justify-center rounded-sm border border-gris-light bg-white p-2">
                    <img src={partner.logoUrl} alt={partner.name} className="max-h-full max-w-full object-contain" />
                  </div>

                  <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      value={partner.name}
                      onChange={(e) => updatePartner(partner.id, { name: e.target.value })}
                      placeholder="Nom du partenaire"
                      maxLength={60}
                      className="rounded-sm border border-gris-light px-3 py-2 text-sm text-nuit"
                    />
                    <input
                      value={partner.url}
                      onChange={(e) => updatePartner(partner.id, { url: e.target.value })}
                      placeholder="https://www.exemple.fr"
                      className="rounded-sm border border-gris-light px-3 py-2 text-sm text-nuit"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <label className="flex cursor-pointer items-center gap-1.5 rounded-sm border border-gris-light px-2.5 py-2 text-xs font-semibold text-nuit hover:bg-gris-light">
                      <Upload size={14} />
                      {uploadingId === partner.id ? "Envoi…" : "Logo"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleReplaceLogo(partner, f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => movePartner(index, -1)}
                      disabled={index === 0}
                      aria-label="Monter"
                      className="rounded-sm border border-gris-light p-2 text-nuit hover:bg-gris-light disabled:opacity-30"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => movePartner(index, 1)}
                      disabled={index === partners.length - 1}
                      aria-label="Descendre"
                      className="rounded-sm border border-gris-light p-2 text-nuit hover:bg-gris-light disabled:opacity-30"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePartner(partner.id)}
                      aria-label={`Retirer ${partner.name}`}
                      className="rounded-sm border border-gris-light p-2 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Ajout */}
          <div className="mt-5 rounded-sm border border-dashed border-gris-light p-4">
            <h3 className="font-heading text-sm font-bold text-nuit">Ajouter un partenaire</h3>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nom du partenaire"
                maxLength={60}
                className="rounded-sm border border-gris-light px-3 py-2 text-sm text-nuit"
              />
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="Lien (https://www.exemple.fr)"
                className="rounded-sm border border-gris-light px-3 py-2 text-sm text-nuit"
              />
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-sm border border-gris-light px-3 py-2 text-xs font-semibold text-nuit hover:bg-gris-light">
                <Upload size={14} />
                <span className="truncate">{newLogoFile ? newLogoFile.name : "Choisir le logo"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setNewLogoFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding}
              className="mt-3 flex items-center gap-1.5 rounded-sm bg-nuit px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              <Plus size={14} />
              {adding ? "Ajout…" : "Ajouter à la liste"}
            </button>
            <p className="mt-2 text-[11px] text-gris">
              Logo PNG, JPEG ou WebP, 2 Mo maximum, de préférence sur fond transparent. L'ajout n'est publié sur le site
              qu'après « Enregistrer ».
            </p>
          </div>

          {error && <div className="mt-4 rounded-sm bg-red-50 p-3 text-sm text-red-500">{error}</div>}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saving}
              className="rounded-sm bg-golfe-green px-5 py-2.5 text-sm font-semibold text-nuit disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
            {saved && (
              <span className="flex items-center gap-1 text-xs font-semibold text-golfe-green">
                <CheckCircle2 size={14} /> Publié sur le site !
              </span>
            )}
            {dirty && !saving && <span className="text-xs text-gris">Modifications non enregistrées</span>}
          </div>
        </>
      )}
    </div>
  );
}
